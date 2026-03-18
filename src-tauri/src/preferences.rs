use crate::notes::{Position, Size};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Preferences {
    #[serde(default)]
    pub panel_size: Option<Size>,
    #[serde(default)]
    pub panel_position: Option<Position>,
}

pub struct PreferencesStore {
    file_path: PathBuf,
    prefs: Preferences,
}

impl PreferencesStore {
    pub fn new(file_path: PathBuf) -> Self {
        let prefs = Self::load_from_disk(&file_path);
        PreferencesStore { file_path, prefs }
    }

    fn load_from_disk(path: &std::path::Path) -> Preferences {
        let data = match fs::read_to_string(path) {
            Ok(d) => d,
            Err(_) => return Preferences::default(),
        };
        serde_json::from_str(&data).unwrap_or_default()
    }

    fn save_to_disk(&self) {
        if let Some(parent) = self.file_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(&self.prefs) {
            let _ = fs::write(&self.file_path, json);
        }
    }

    pub fn get_panel_size(&self) -> Option<Size> {
        self.prefs.panel_size.clone()
    }

    pub fn set_panel_size(&mut self, width: f64, height: f64) {
        self.prefs.panel_size = Some(Size { width, height });
        self.save_to_disk();
    }

    pub fn get_panel_position(&self) -> Option<Position> {
        self.prefs.panel_position.clone()
    }

    pub fn set_panel_position(&mut self, x: f64, y: f64) {
        self.prefs.panel_position = Some(Position { x, y });
        self.save_to_disk();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    #[test]
    fn test_default_no_panel_size() {
        let file = NamedTempFile::new().unwrap();
        let store = PreferencesStore::new(file.path().to_path_buf());
        assert!(store.get_panel_size().is_none());
    }

    #[test]
    fn test_set_and_get_panel_size() {
        let file = NamedTempFile::new().unwrap();
        let mut store = PreferencesStore::new(file.path().to_path_buf());
        store.set_panel_size(400.0, 600.0);
        let size = store.get_panel_size().unwrap();
        assert!((size.width - 400.0).abs() < f64::EPSILON);
        assert!((size.height - 600.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_default_no_panel_position() {
        let file = NamedTempFile::new().unwrap();
        let store = PreferencesStore::new(file.path().to_path_buf());
        assert!(store.get_panel_position().is_none());
    }

    #[test]
    fn test_set_and_get_panel_position() {
        let file = NamedTempFile::new().unwrap();
        let mut store = PreferencesStore::new(file.path().to_path_buf());
        store.set_panel_position(100.0, 200.0);
        let pos = store.get_panel_position().unwrap();
        assert!((pos.x - 100.0).abs() < f64::EPSILON);
        assert!((pos.y - 200.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_persistence() {
        let file = NamedTempFile::new().unwrap();
        let path = file.path().to_path_buf();
        {
            let mut store = PreferencesStore::new(path.clone());
            store.set_panel_size(350.0, 500.0);
        }
        let store2 = PreferencesStore::new(path);
        let size = store2.get_panel_size().unwrap();
        assert!((size.width - 350.0).abs() < f64::EPSILON);
        assert!((size.height - 500.0).abs() < f64::EPSILON);
    }
}
