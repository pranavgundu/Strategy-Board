//! PDF export layout planning.
//!
//! This module intentionally does not produce a PDF. Native rendering needs a
//! chosen renderer and platform save/share UI; keeping the deterministic plan
//! separate lets both be added without changing pagination behavior.

pub const A4_WIDTH_MM: f32 = 210.0;
pub const A4_HEIGHT_MM: f32 = 297.0;
pub const STANDARD_MARGIN_MM: f32 = 20.0;
pub const STANDARD_QR_SIZE_MM: f32 = 80.0;
pub const STANDARD_SPACING_MM: f32 = 15.0;
pub const LARGE_QR_SIZE_MM: f32 = 150.0;

#[derive(Debug, Clone, PartialEq)]
pub struct PdfText {
    pub value: String,
    pub x_mm: f32,
    pub y_mm: f32,
    pub font_size_pt: f32,
    pub bold: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct QrPlacement {
    pub payload: String,
    /// One-based position in the exported sequence.
    pub ordinal: usize,
    pub total: usize,
    pub x_mm: f32,
    pub y_mm: f32,
    pub size_mm: f32,
    pub label: Option<PdfText>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PdfPagePlan {
    /// Zero-based page number.
    pub page_index: usize,
    pub texts: Vec<PdfText>,
    pub qr_codes: Vec<QrPlacement>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct PdfDocumentPlan {
    pub width_mm: f32,
    pub height_mm: f32,
    pub pages: Vec<PdfPagePlan>,
}

impl PdfDocumentPlan {
    pub fn standard(data: &[String], match_name: &str) -> Self {
        let codes_per_row = ((A4_WIDTH_MM - 2.0 * STANDARD_MARGIN_MM)
            / (STANDARD_QR_SIZE_MM + STANDARD_SPACING_MM))
            .floor() as usize;
        let codes_per_column = ((A4_HEIGHT_MM - 2.0 * STANDARD_MARGIN_MM - 30.0)
            / (STANDARD_QR_SIZE_MM + STANDARD_SPACING_MM))
            .floor() as usize;
        let codes_per_page = codes_per_row * codes_per_column;
        debug_assert!(codes_per_page > 0);

        // jsPDF creates the first page before the loop, even for an empty list.
        let page_count = data.len().max(1).div_ceil(codes_per_page);
        let mut pages = Vec::with_capacity(page_count);
        for page_index in 0..page_count {
            let mut texts = vec![centered(
                match_name,
                STANDARD_MARGIN_MM,
                if page_index == 0 { 20.0 } else { 16.0 },
                true,
            )];
            if page_index == 0 {
                texts.push(centered(
                    &format!("Scan each QR code in order ({} total)", data.len()),
                    STANDARD_MARGIN_MM + 10.0,
                    12.0,
                    false,
                ));
            }
            let mut qr_codes = Vec::new();
            let start = page_index * codes_per_page;
            let end = (start + codes_per_page).min(data.len());
            for (position_on_page, ordinal) in (start..end).enumerate() {
                let row = position_on_page / codes_per_row;
                let column = position_on_page % codes_per_row;
                let x_mm = STANDARD_MARGIN_MM
                    + column as f32 * (STANDARD_QR_SIZE_MM + STANDARD_SPACING_MM);
                let y_mm = STANDARD_MARGIN_MM
                    + 20.0
                    + row as f32 * (STANDARD_QR_SIZE_MM + STANDARD_SPACING_MM);
                qr_codes.push(QrPlacement {
                    payload: data[ordinal].clone(),
                    ordinal: ordinal + 1,
                    total: data.len(),
                    x_mm,
                    y_mm,
                    size_mm: STANDARD_QR_SIZE_MM,
                    label: Some(centered_at(
                        &format!("{} of {}", ordinal + 1, data.len()),
                        x_mm + STANDARD_QR_SIZE_MM / 2.0,
                        y_mm + STANDARD_QR_SIZE_MM + 5.0,
                        10.0,
                        false,
                    )),
                });
            }
            pages.push(PdfPagePlan {
                page_index,
                texts,
                qr_codes,
            });
        }
        Self {
            width_mm: A4_WIDTH_MM,
            height_mm: A4_HEIGHT_MM,
            pages,
        }
    }

    pub fn large(data: &[String], match_name: &str) -> Self {
        let pages = data
            .iter()
            .enumerate()
            .map(|(page_index, payload)| {
                let ordinal = page_index + 1;
                let x_mm = (A4_WIDTH_MM - LARGE_QR_SIZE_MM) / 2.0;
                let y_mm = (A4_HEIGHT_MM - LARGE_QR_SIZE_MM) / 2.0;
                PdfPagePlan {
                    page_index,
                    texts: vec![
                        centered(match_name, 30.0, 24.0, true),
                        centered(
                            &format!("QR Code {ordinal} of {}", data.len()),
                            45.0,
                            16.0,
                            false,
                        ),
                        centered(
                            "Scan this code, then move to the next page",
                            A4_HEIGHT_MM - 30.0,
                            14.0,
                            false,
                        ),
                    ],
                    qr_codes: vec![QrPlacement {
                        payload: payload.clone(),
                        ordinal,
                        total: data.len(),
                        x_mm,
                        y_mm,
                        size_mm: LARGE_QR_SIZE_MM,
                        label: None,
                    }],
                }
            })
            .collect();
        Self {
            width_mm: A4_WIDTH_MM,
            height_mm: A4_HEIGHT_MM,
            pages,
        }
    }
}

fn centered(value: &str, y_mm: f32, font_size_pt: f32, bold: bool) -> PdfText {
    centered_at(value, A4_WIDTH_MM / 2.0, y_mm, font_size_pt, bold)
}

fn centered_at(value: &str, x_mm: f32, y_mm: f32, font_size_pt: f32, bold: bool) -> PdfText {
    PdfText {
        value: value.to_owned(),
        x_mm,
        y_mm,
        font_size_pt,
        bold,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn standard_layout_matches_legacy_a4_capacity_and_header() {
        let data = vec!["one".into(), "two".into(), "three".into()];
        let plan = PdfDocumentPlan::standard(&data, "Match 1");
        assert_eq!(plan.width_mm, 210.0);
        assert_eq!(plan.height_mm, 297.0);
        // Legacy sizing yields one code per row and two codes per page.
        assert_eq!(plan.pages.len(), 2);
        assert_eq!(plan.pages[0].texts[0].value, "Match 1");
        assert_eq!(plan.pages[0].texts[0].font_size_pt, 20.0);
        assert_eq!(
            plan.pages[0].texts[1].value,
            "Scan each QR code in order (3 total)"
        );
        assert_eq!(plan.pages[1].texts.len(), 1);
        assert_eq!(plan.pages[1].texts[0].font_size_pt, 16.0);
    }

    #[test]
    fn standard_layout_places_and_labels_qrs_in_reading_order() {
        let data = vec!["a".into(), "b".into()];
        let plan = PdfDocumentPlan::standard(&data, "M");
        let codes = &plan.pages[0].qr_codes;
        assert_eq!(codes.len(), 2);
        assert_eq!(
            (codes[0].x_mm, codes[0].y_mm, codes[0].size_mm),
            (20.0, 40.0, 80.0)
        );
        assert_eq!((codes[1].x_mm, codes[1].y_mm), (20.0, 135.0));
        assert_eq!(codes[0].label.as_ref().unwrap().value, "1 of 2");
        assert_eq!(codes[1].label.as_ref().unwrap().value, "2 of 2");
    }

    #[test]
    fn standard_empty_export_retains_its_intro_page() {
        let plan = PdfDocumentPlan::standard(&[], "Empty match");
        assert_eq!(plan.pages.len(), 1);
        assert!(plan.pages[0].qr_codes.is_empty());
        assert_eq!(
            plan.pages[0].texts[1].value,
            "Scan each QR code in order (0 total)"
        );
    }

    #[test]
    fn large_layout_uses_one_centered_code_per_page() {
        let data = vec!["a".into(), "b".into()];
        let plan = PdfDocumentPlan::large(&data, "Finals");
        assert_eq!(plan.pages.len(), 2);
        for (index, page) in plan.pages.iter().enumerate() {
            assert_eq!(page.qr_codes.len(), 1);
            assert_eq!((page.qr_codes[0].x_mm, page.qr_codes[0].y_mm), (30.0, 73.5));
            assert_eq!(page.qr_codes[0].size_mm, 150.0);
            assert_eq!(page.texts[1].value, format!("QR Code {} of 2", index + 1));
            assert_eq!(
                page.texts[2].value,
                "Scan this code, then move to the next page"
            );
        }
    }

    #[test]
    fn large_empty_export_has_no_renderable_qr_pages() {
        assert!(PdfDocumentPlan::large(&[], "Empty").pages.is_empty());
    }
}
