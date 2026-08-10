//! QR transport framing. Rendering and camera access remain frontend concerns.

use std::collections::BTreeMap;

use serde_json::Value;

pub const CHUNK_INDEX_WIDTH: usize = 4;
pub const TOTAL_CHUNKS_WIDTH: usize = 4;
pub const CHUNK_HEADER_SIZE: usize = CHUNK_INDEX_WIDTH + TOTAL_CHUNKS_WIDTH;
pub const MAX_CHUNK_PAYLOAD: usize = 200;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QrError {
    TooManyChunks(usize),
    FrameTooShort,
    InvalidHeader,
    InvalidTotal,
    ChunkOutOfRange { index: usize, total: usize },
    InvalidBase64,
    InvalidUtf8,
    InvalidJson(String),
    PacketIsNotAnArray,
}

impl std::fmt::Display for QrError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::TooManyChunks(total) => {
                write!(formatter, "QR stream has {total} chunks; maximum is 9999")
            }
            Self::FrameTooShort => write!(formatter, "QR frame is shorter than its header"),
            Self::InvalidHeader => write!(formatter, "QR frame header is not eight ASCII digits"),
            Self::InvalidTotal => write!(formatter, "QR frame declares zero chunks"),
            Self::ChunkOutOfRange { index, total } => write!(
                formatter,
                "QR chunk {index} is outside stream length {total}"
            ),
            Self::InvalidBase64 => write!(formatter, "QR payload is not valid base64"),
            Self::InvalidUtf8 => write!(formatter, "QR payload is not UTF-8"),
            Self::InvalidJson(error) => write!(formatter, "QR payload is not JSON: {error}"),
            Self::PacketIsNotAnArray => write!(formatter, "QR match packet is not an array"),
        }
    }
}

impl std::error::Error for QrError {}

/// Encodes UTF-8 data into the legacy `IIII TTTT payload` QR wire format.
pub fn encode_frames(payload: &str) -> Result<Vec<String>, QrError> {
    let encoded = encode_base64(payload.as_bytes());
    let chunks: Vec<&str> = if encoded.is_empty() {
        vec![""]
    } else {
        encoded
            .as_bytes()
            .chunks(MAX_CHUNK_PAYLOAD)
            .map(|chunk| std::str::from_utf8(chunk).expect("base64 is ASCII"))
            .collect()
    };
    if chunks.len() > 9_999 {
        return Err(QrError::TooManyChunks(chunks.len()));
    }
    let total = chunks.len();
    Ok(chunks
        .iter()
        .enumerate()
        .map(|(index, chunk)| format!("{index:04}{total:04}{chunk}"))
        .collect())
}

/// The import state machine accepts frames in any order and ignores duplicates.
#[derive(Debug, Default, Clone)]
pub struct QrImportState {
    expected_total: Option<usize>,
    received: BTreeMap<usize, String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScanProgress {
    Receiving {
        received: usize,
        total: usize,
        duplicate: bool,
    },
    Complete(String),
}

impl QrImportState {
    pub fn reset(&mut self) {
        self.expected_total = None;
        self.received.clear();
    }

    pub fn expected_total(&self) -> Option<usize> {
        self.expected_total
    }

    pub fn received_count(&self) -> usize {
        self.received.len()
    }

    pub fn receive(&mut self, frame: &str) -> Result<ScanProgress, QrError> {
        let (index, total, payload) = parse_frame(frame)?;

        // A different declared stream length is the legacy stream boundary.
        if self
            .expected_total
            .is_some_and(|expected| expected != total)
        {
            self.reset();
        }
        if self.expected_total.is_none() {
            self.expected_total = Some(total);
        }
        if index >= total {
            return Err(QrError::ChunkOutOfRange { index, total });
        }

        let duplicate = self.received.insert(index, payload.to_owned()).is_some();
        let received = self.received.len();
        if received != total {
            return Ok(ScanProgress::Receiving {
                received,
                total,
                duplicate,
            });
        }

        let complete = self.reconstruct_and_reset();
        complete.map(ScanProgress::Complete)
    }

    fn reconstruct_and_reset(&mut self) -> Result<String, QrError> {
        let total = self.expected_total.expect("set before reconstruction");
        let mut encoded = String::new();
        for index in 0..total {
            let Some(chunk) = self.received.get(&index) else {
                // The count can only equal total if every in-range index exists.
                self.reset();
                return Err(QrError::ChunkOutOfRange { index, total });
            };
            encoded.push_str(chunk);
        }
        self.reset();
        let bytes = decode_base64(&encoded)?;
        String::from_utf8(bytes).map_err(|_| QrError::InvalidUtf8)
    }
}

/// Validates the completed payload as JSON, matching the importer before it
/// calls the frontend's apply callback.
pub fn parse_completed_json(payload: &str) -> Result<Value, QrError> {
    serde_json::from_str(payload).map_err(|error| QrError::InvalidJson(error.to_string()))
}

/// Restores the `null` element removed at index seven by the legacy exporter.
pub fn restore_match_packet(mut packet: Vec<Value>) -> Vec<Value> {
    // JavaScript's `splice(7, 0, null)` appends when the packet is shorter.
    packet.insert(packet.len().min(7), Value::Null);
    packet
}

pub fn restore_match_packet_json(payload: &str) -> Result<Vec<Value>, QrError> {
    let value = parse_completed_json(payload)?;
    let Value::Array(packet) = value else {
        return Err(QrError::PacketIsNotAnArray);
    };
    Ok(restore_match_packet(packet))
}

fn parse_frame(frame: &str) -> Result<(usize, usize, &str), QrError> {
    if frame.len() < CHUNK_HEADER_SIZE {
        return Err(QrError::FrameTooShort);
    }
    let (header, payload) = frame.split_at(CHUNK_HEADER_SIZE);
    if !header.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(QrError::InvalidHeader);
    }
    let index = header[..CHUNK_INDEX_WIDTH]
        .parse()
        .map_err(|_| QrError::InvalidHeader)?;
    let total = header[CHUNK_INDEX_WIDTH..]
        .parse()
        .map_err(|_| QrError::InvalidHeader)?;
    if total == 0 {
        return Err(QrError::InvalidTotal);
    }
    Ok((index, total, payload))
}

const BASE64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

fn encode_base64(input: &[u8]) -> String {
    let mut output = String::with_capacity(input.len().div_ceil(3) * 4);
    for group in input.chunks(3) {
        let first = group[0];
        let second = *group.get(1).unwrap_or(&0);
        let third = *group.get(2).unwrap_or(&0);
        output.push(BASE64[(first >> 2) as usize] as char);
        output.push(BASE64[(((first & 0b11) << 4) | (second >> 4)) as usize] as char);
        output.push(if group.len() > 1 {
            BASE64[(((second & 0b1111) << 2) | (third >> 6)) as usize] as char
        } else {
            '='
        });
        output.push(if group.len() > 2 {
            BASE64[(third & 0b11_1111) as usize] as char
        } else {
            '='
        });
    }
    output
}

fn decode_base64(input: &str) -> Result<Vec<u8>, QrError> {
    if !input.len().is_multiple_of(4) {
        return Err(QrError::InvalidBase64);
    }
    let bytes = input.as_bytes();
    let mut output = Vec::with_capacity(bytes.len() / 4 * 3);
    for (group_index, group) in bytes.chunks(4).enumerate() {
        let is_last = group_index + 1 == bytes.len() / 4;
        let a = decode_base64_digit(group[0])?;
        let b = decode_base64_digit(group[1])?;
        let c_padding = group[2] == b'=';
        let d_padding = group[3] == b'=';
        if c_padding && !d_padding || (!is_last && (c_padding || d_padding)) {
            return Err(QrError::InvalidBase64);
        }
        let c = if c_padding {
            0
        } else {
            decode_base64_digit(group[2])?
        };
        let d = if d_padding {
            0
        } else {
            decode_base64_digit(group[3])?
        };
        output.push((a << 2) | (b >> 4));
        if !c_padding {
            output.push((b << 4) | (c >> 2));
        }
        if !d_padding {
            output.push((c << 6) | d);
        }
    }
    Ok(output)
}

fn decode_base64_digit(byte: u8) -> Result<u8, QrError> {
    BASE64
        .iter()
        .position(|candidate| *candidate == byte)
        .map(|index| index as u8)
        .ok_or(QrError::InvalidBase64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn frames_round_trip_unicode_payload_and_use_legacy_headers() {
        let payload = r#"{"team":"Méga 🤖","score":42}"#;
        let frames = encode_frames(payload).unwrap();
        assert_eq!(&frames[0][..8], "00000001");
        let mut state = QrImportState::default();
        assert_eq!(
            state.receive(&frames[0]).unwrap(),
            ScanProgress::Complete(payload.to_owned())
        );
        assert_eq!(state.expected_total(), None);
    }

    #[test]
    fn multi_frame_stream_accepts_out_of_order_data_and_ignores_duplicates() {
        let payload = "x".repeat(400);
        let frames = encode_frames(&payload).unwrap();
        assert_eq!(frames.len(), 3);
        let mut state = QrImportState::default();
        assert_eq!(
            state.receive(&frames[1]).unwrap(),
            ScanProgress::Receiving {
                received: 1,
                total: 3,
                duplicate: false
            }
        );
        assert_eq!(
            state.receive(&frames[1]).unwrap(),
            ScanProgress::Receiving {
                received: 1,
                total: 3,
                duplicate: true
            }
        );
        assert_eq!(
            state.receive(&frames[2]).unwrap(),
            ScanProgress::Receiving {
                received: 2,
                total: 3,
                duplicate: false
            }
        );
        assert_eq!(
            state.receive(&frames[0]).unwrap(),
            ScanProgress::Complete(payload)
        );
    }

    #[test]
    fn a_new_stream_length_resets_existing_progress() {
        let first = encode_frames(&"x".repeat(400)).unwrap();
        let second = encode_frames("new stream").unwrap();
        let mut state = QrImportState::default();
        state.receive(&first[0]).unwrap();
        assert_eq!(state.expected_total(), Some(3));
        assert_eq!(
            state.receive(&second[0]).unwrap(),
            ScanProgress::Complete("new stream".into())
        );
        assert_eq!(state.received_count(), 0);
    }

    #[test]
    fn malformed_headers_ranges_and_corrupt_payloads_are_rejected() {
        let mut state = QrImportState::default();
        assert_eq!(state.receive("short").unwrap_err(), QrError::FrameTooShort);
        assert_eq!(
            state.receive("abcd0001payload").unwrap_err(),
            QrError::InvalidHeader
        );
        assert_eq!(
            state.receive("00000000").unwrap_err(),
            QrError::InvalidTotal
        );
        assert_eq!(
            state.receive("00010001payload").unwrap_err(),
            QrError::ChunkOutOfRange { index: 1, total: 1 }
        );
        assert_eq!(
            state.receive("00000001%%%%").unwrap_err(),
            QrError::InvalidBase64
        );
        assert_eq!(
            state.receive("00000001/w==").unwrap_err(),
            QrError::InvalidUtf8
        );
    }

    #[test]
    fn completed_json_and_match_packet_restoration_are_validated() {
        assert_eq!(
            parse_completed_json(r#"{"ok":true}"#).unwrap(),
            json!({"ok": true})
        );
        assert!(matches!(
            parse_completed_json("not json"),
            Err(QrError::InvalidJson(_))
        ));
        let packet = restore_match_packet_json("[0,1,2,3,4,5,6,8]").unwrap();
        assert_eq!(packet[7], Value::Null);
        assert_eq!(packet[8], json!(8));
        assert_eq!(
            restore_match_packet_json("{}"),
            Err(QrError::PacketIsNotAnArray)
        );
        assert_eq!(
            restore_match_packet(vec![json!(1)]),
            vec![json!(1), Value::Null]
        );
    }

    #[test]
    fn empty_payload_is_a_valid_single_frame_transport() {
        let frames = encode_frames("").unwrap();
        assert_eq!(frames, vec!["00000001"]);
        assert_eq!(
            QrImportState::default().receive(&frames[0]).unwrap(),
            ScanProgress::Complete(String::new())
        );
    }
}
