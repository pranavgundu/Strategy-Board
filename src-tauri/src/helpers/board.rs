use serde::{Deserialize, Serialize};
use std::panic::{catch_unwind, AssertUnwindSafe};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum BoardMode {
    Auto,
    Teleop,
    Transition,
    Endgame,
    Notes,
    Statbotics,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BoardTool {
    Marker,
    Eraser,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BoardState {
    pub mode: BoardMode,
    pub tool: BoardTool,
    pub color: u8,
    pub can_undo: bool,
    pub can_redo: bool,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct CanvasLayout {
    pub scale: f64,
    pub left: f64,
    pub top: f64,
}

pub fn canvas_layout(
    wrapper_width: f64,
    wrapper_height: f64,
    canvas_width: f64,
    canvas_height: f64,
    field_year: Option<u16>,
) -> Option<CanvasLayout> {
    if wrapper_width <= 0.0 || wrapper_height <= 0.0 || canvas_width <= 0.0 || canvas_height <= 0.0
    {
        return None;
    }

    let scale = (wrapper_width / canvas_width).min(wrapper_height / canvas_height);
    let scaled_width = canvas_width * scale;
    let scaled_height = canvas_height * scale;
    let left = (wrapper_width - scaled_width) / 2.0;
    let centered_top = (wrapper_height - scaled_height) / 2.0;
    let visible_offset = if field_year == Some(2026) { -30.0 } else { 0.0 };
    let max_top = (wrapper_height - scaled_height).max(0.0);
    let top = (centered_top + visible_offset).clamp(0.0, max_top);

    Some(CanvasLayout { scale, left, top })
}

type Listener = Box<dyn FnMut(&BoardState) + Send + 'static>;

pub struct Board {
    mode: BoardMode,
    tool: BoardTool,
    color: u8,
    undo: std::collections::HashMap<BoardMode, Vec<String>>,
    redo: std::collections::HashMap<BoardMode, Vec<String>>,
    listeners: Vec<Option<Listener>>,
}

impl Default for Board {
    fn default() -> Self {
        Self {
            mode: BoardMode::Auto,
            tool: BoardTool::Marker,
            color: 0,
            undo: std::collections::HashMap::new(),
            redo: std::collections::HashMap::new(),
            listeners: Vec::new(),
        }
    }
}

impl Board {
    pub const MAX_HISTORY_SIZE: usize = 100;

    pub fn state(&self) -> BoardState {
        BoardState {
            mode: self.mode,
            tool: self.tool,
            color: self.color,
            can_undo: self.can_undo(),
            can_redo: self.can_redo(),
        }
    }

    pub fn set_mode(&mut self, mode: BoardMode) {
        if self.mode != mode {
            self.mode = mode;
            self.notify();
        }
    }

    pub fn set_tool(&mut self, tool: BoardTool) {
        if self.tool != tool {
            self.tool = tool;
            self.notify();
        }
    }

    pub fn set_color(&mut self, color: i16) {
        if !(0..=4).contains(&color) || self.color == color as u8 {
            return;
        }
        self.color = color as u8;
        self.notify();
    }

    pub fn can_undo(&self) -> bool {
        self.undo
            .get(&self.mode)
            .is_some_and(|history| !history.is_empty())
    }

    pub fn can_redo(&self) -> bool {
        self.redo
            .get(&self.mode)
            .is_some_and(|history| !history.is_empty())
    }

    pub fn record_action(&mut self, action: String) {
        self.redo.remove(&self.mode);
        let history = self.undo.entry(self.mode).or_default();
        history.push(action);
        if history.len() > Self::MAX_HISTORY_SIZE {
            history.remove(0);
        }
        self.notify();
    }

    pub fn undo(&mut self) -> Option<String> {
        let action = self.undo.entry(self.mode).or_default().pop()?;
        self.redo.entry(self.mode).or_default().push(action.clone());
        self.notify();
        Some(action)
    }

    pub fn redo(&mut self) -> Option<String> {
        let action = self.redo.entry(self.mode).or_default().pop()?;
        self.undo.entry(self.mode).or_default().push(action.clone());
        self.notify();
        Some(action)
    }

    pub fn subscribe<F>(&mut self, listener: F) -> usize
    where
        F: FnMut(&BoardState) + Send + 'static,
    {
        let id = self.listeners.len();
        self.listeners.push(Some(Box::new(listener)));
        let state = self.state();
        if let Some(listener) = self.listeners[id].as_mut() {
            let _ = catch_unwind(AssertUnwindSafe(|| listener(&state)));
        }
        id
    }

    pub fn unsubscribe(&mut self, id: usize) {
        if let Some(listener) = self.listeners.get_mut(id) {
            *listener = None;
        }
    }

    fn notify(&mut self) {
        let state = self.state();
        for listener in self.listeners.iter_mut().flatten() {
            let _ = catch_unwind(AssertUnwindSafe(|| listener(&state)));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[test]
    fn starts_with_the_legacy_public_state() {
        let board = Board::default();
        assert_eq!(
            board.state(),
            BoardState {
                mode: BoardMode::Auto,
                tool: BoardTool::Marker,
                color: 0,
                can_undo: false,
                can_redo: false,
            }
        );
    }

    #[test]
    fn mode_tool_and_color_are_driven_through_the_public_api() {
        let mut board = Board::default();
        for mode in [
            BoardMode::Teleop,
            BoardMode::Transition,
            BoardMode::Endgame,
            BoardMode::Notes,
            BoardMode::Statbotics,
        ] {
            board.set_mode(mode);
            assert_eq!(board.state().mode, mode);
        }
        board.set_tool(BoardTool::Eraser);
        board.set_color(3);
        assert_eq!(board.state().tool, BoardTool::Eraser);
        assert_eq!(board.state().color, 3);
    }

    #[test]
    fn out_of_range_colors_are_ignored() {
        let mut board = Board::default();
        board.set_color(9);
        board.set_color(-1);
        assert_eq!(board.state().color, 0);
    }

    #[test]
    fn listeners_receive_initial_and_changed_state_and_can_unsubscribe() {
        let mut board = Board::default();
        let seen = Arc::new(Mutex::new(Vec::new()));
        let output = Arc::clone(&seen);
        let id = board.subscribe(move |state| output.lock().unwrap().push(*state));
        assert_eq!(seen.lock().unwrap().len(), 1);

        board.set_mode(BoardMode::Notes);
        board.set_color(2);
        assert_eq!(seen.lock().unwrap().last().unwrap().color, 2);

        board.unsubscribe(id);
        let count = seen.lock().unwrap().len();
        board.set_mode(BoardMode::Auto);
        assert_eq!(seen.lock().unwrap().len(), count);
    }

    #[test]
    fn a_panicking_listener_does_not_block_other_listeners() {
        let mut board = Board::default();
        board.subscribe(|_| panic!("listener boom"));
        let seen = Arc::new(Mutex::new(Vec::new()));
        let output = Arc::clone(&seen);
        board.subscribe(move |state| output.lock().unwrap().push(*state));

        board.set_mode(BoardMode::Teleop);
        assert_eq!(seen.lock().unwrap().last().unwrap().mode, BoardMode::Teleop);
    }

    #[test]
    fn undo_and_redo_availability_is_scoped_to_the_active_mode() {
        let mut board = Board::default();
        board.record_action("stroke-1".to_owned());
        assert!(board.can_undo());
        assert!(!board.can_redo());
        assert_eq!(board.undo().as_deref(), Some("stroke-1"));
        assert!(!board.can_undo());
        assert!(board.can_redo());

        board.set_mode(BoardMode::Teleop);
        assert!(!board.can_undo());
        assert!(!board.can_redo());
        board.set_mode(BoardMode::Auto);
        assert!(board.can_redo());
        assert_eq!(board.redo().as_deref(), Some("stroke-1"));
    }

    #[test]
    fn history_is_bounded_like_the_legacy_whiteboard() {
        let mut board = Board::default();
        for index in 0..=Board::MAX_HISTORY_SIZE {
            board.record_action(index.to_string());
        }
        for _ in 0..Board::MAX_HISTORY_SIZE {
            assert!(board.undo().is_some());
        }
        assert!(board.undo().is_none());
    }

    #[test]
    fn missing_or_invalid_canvas_geometry_is_a_safe_noop() {
        assert_eq!(canvas_layout(0.0, 600.0, 3510.0, 1610.0, None), None);
        assert_eq!(canvas_layout(1000.0, 600.0, 0.0, 1610.0, None), None);
    }

    #[test]
    fn all_canvas_layers_can_share_one_centered_layout() {
        let layout = canvas_layout(1000.0, 600.0, 3510.0, 1610.0, None).unwrap();
        assert!(layout.scale > 0.0);
        assert!(layout.left >= 0.0);
        assert!(layout.top >= 0.0);
    }

    #[test]
    fn canvas_layout_matches_the_whiteboard_formula_including_2026_crop() {
        // 1000 / 3510 is the constraining dimension. The legacy browser code
        // centers the resulting 458.69px field vertically, then offsets the
        // 2026 artwork upward by 30px without allowing a negative top value.
        let regular = canvas_layout(1000.0, 600.0, 3510.0, 1610.0, Some(2025)).unwrap();
        let reefscape = canvas_layout(1000.0, 600.0, 3510.0, 1610.0, Some(2026)).unwrap();
        assert!((regular.scale - 1000.0 / 3510.0).abs() < f64::EPSILON);
        assert!((regular.left - 0.0).abs() < f64::EPSILON);
        assert!((regular.top - 70.65527065527065).abs() < 1e-9);
        assert!((reefscape.top - 40.65527065527065).abs() < 1e-9);

        // A full-height field has no vertical slack, so the offset clamps.
        assert_eq!(
            canvas_layout(1000.0, 1000.0 * 1610.0 / 3510.0, 3510.0, 1610.0, Some(2026))
                .unwrap()
                .top,
            0.0
        );
    }

    #[test]
    fn resize_and_orientation_changes_recompute_layout() {
        let initial = canvas_layout(1000.0, 600.0, 3510.0, 1610.0, None).unwrap();
        let resized = canvas_layout(1800.0, 700.0, 3510.0, 1610.0, None).unwrap();
        let rotated = canvas_layout(800.0, 1200.0, 3510.0, 1610.0, None).unwrap();
        assert_ne!(initial.scale, resized.scale);
        assert_ne!(resized.scale, rotated.scale);
    }
}
