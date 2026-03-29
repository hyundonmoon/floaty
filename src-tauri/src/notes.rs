use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Size {
    pub width: f64,
    pub height: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Note {
    pub id: String,
    pub text: String,
    pub pinned: bool,
    pub position: Option<Position>,
    #[serde(default)]
    pub size: Option<Size>,
    #[serde(default)]
    pub content: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
struct NotesFile {
    notes: Vec<Note>,
}

pub struct NoteStore {
    file_path: PathBuf,
    notes: Vec<Note>,
}

impl NoteStore {
    pub fn new(file_path: PathBuf) -> Self {
        let notes = Self::load_from_disk(&file_path);
        NoteStore { file_path, notes }
    }

    fn load_from_disk(path: &PathBuf) -> Vec<Note> {
        let data = match fs::read_to_string(path) {
            Ok(d) => d,
            Err(_) => return Vec::new(),
        };
        match serde_json::from_str::<NotesFile>(&data) {
            Ok(file) => file.notes,
            Err(_) => {
                // Back up corrupt file
                let mut backup = path.clone();
                backup.set_extension("json.bak");
                let _ = fs::copy(path, backup);
                Vec::new()
            }
        }
    }

    fn save_to_disk(&self) {
        if let Some(parent) = self.file_path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let file = NotesFile {
            notes: self.notes.clone(),
        };
        if let Ok(json) = serde_json::to_string_pretty(&file) {
            let _ = fs::write(&self.file_path, json);
        }
    }

    pub fn get_all(&self) -> Vec<Note> {
        self.notes.clone()
    }

    pub fn get_pinned(&self) -> Vec<Note> {
        self.notes.iter().filter(|n| n.pinned).cloned().collect()
    }

    pub fn create(&mut self) -> Note {
        let note = Note {
            id: uuid::Uuid::new_v4().to_string(),
            text: String::new(),
            pinned: false,
            position: None,
            size: None,
            content: None,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        self.notes.insert(0, note.clone());
        self.save_to_disk();
        note
    }

    pub fn update_text(&mut self, id: &str, text: &str) -> Option<Note> {
        let idx = self.notes.iter().position(|n| n.id == id)?;
        self.notes[idx].text = text.to_string();
        self.save_to_disk();
        Some(self.notes[idx].clone())
    }

    pub fn update_content(&mut self, id: &str, content: &str, text: &str) -> Option<Note> {
        let idx = self.notes.iter().position(|n| n.id == id)?;
        self.notes[idx].content = Some(content.to_string());
        self.notes[idx].text = text.to_string();
        self.save_to_disk();
        Some(self.notes[idx].clone())
    }

    pub fn delete(&mut self, id: &str) {
        self.notes.retain(|n| n.id != id);
        self.save_to_disk();
    }

    pub fn set_pinned(&mut self, id: &str, pinned: bool) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == id) {
            note.pinned = pinned;
            self.save_to_disk();
        }
    }

    pub fn update_position(&mut self, id: &str, x: f64, y: f64) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == id) {
            note.position = Some(Position { x, y });
            self.save_to_disk();
        }
    }

    pub fn update_size(&mut self, id: &str, width: f64, height: f64) {
        if let Some(note) = self.notes.iter_mut().find(|n| n.id == id) {
            note.size = Some(Size { width, height });
            self.save_to_disk();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn temp_store() -> (NoteStore, NamedTempFile) {
        let file = NamedTempFile::new().unwrap();
        let store = NoteStore::new(file.path().to_path_buf());
        (store, file)
    }

    #[test]
    fn test_create_and_get() {
        let (mut store, _f) = temp_store();
        let note = store.create();
        assert!(!note.id.is_empty());
        assert_eq!(store.get_all().len(), 1);
    }

    #[test]
    fn test_update_text() {
        let (mut store, _f) = temp_store();
        let note = store.create();
        let updated = store.update_text(&note.id, "hello").unwrap();
        assert_eq!(updated.text, "hello");
    }

    #[test]
    fn test_delete() {
        let (mut store, _f) = temp_store();
        let note = store.create();
        store.delete(&note.id);
        assert_eq!(store.get_all().len(), 0);
    }

    #[test]
    fn test_pin_unpin() {
        let (mut store, _f) = temp_store();
        let note = store.create();
        store.set_pinned(&note.id, true);
        assert_eq!(store.get_pinned().len(), 1);
        store.set_pinned(&note.id, false);
        assert_eq!(store.get_pinned().len(), 0);
    }

    #[test]
    fn test_persistence() {
        let file = NamedTempFile::new().unwrap();
        let path = file.path().to_path_buf();
        {
            let mut store = NoteStore::new(path.clone());
            store.create();
        }
        let store2 = NoteStore::new(path);
        assert_eq!(store2.get_all().len(), 1);
    }

    #[test]
    fn test_update_size() {
        let (mut store, _f) = temp_store();
        let note = store.create();
        store.update_size(&note.id, 300.0, 250.0);
        let updated = store.get_all();
        let size = updated[0].size.as_ref().unwrap();
        assert!((size.width - 300.0).abs() < f64::EPSILON);
        assert!((size.height - 250.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_update_content() {
        let (mut store, _f) = temp_store();
        let note = store.create();
        let updated = store.update_content(&note.id, "<p><strong>hello</strong></p>", "hello").unwrap();
        assert_eq!(updated.content.as_deref(), Some("<p><strong>hello</strong></p>"));
        assert_eq!(updated.text, "hello");

        // update_text should preserve content
        let preserved = store.update_text(&note.id, "plain").unwrap();
        assert_eq!(preserved.content.as_deref(), Some("<p><strong>hello</strong></p>"));
        assert_eq!(preserved.text, "plain");
    }

    #[test]
    fn test_update_text_preserves_content() {
        let (mut store, _f) = temp_store();
        let note = store.create();
        // Set rich content
        store.update_content(&note.id, "<p><strong>bold</strong></p>", "bold");
        // Update text (simulating a plain text edit)
        let updated = store.update_text(&note.id, "new text").unwrap();
        // content should NOT be cleared
        assert_eq!(updated.content.as_deref(), Some("<p><strong>bold</strong></p>"));
        assert_eq!(updated.text, "new text");
    }

    #[test]
    fn test_corrupt_file_recovery() {
        let mut file = NamedTempFile::new().unwrap();
        write!(file, "not json").unwrap();
        let store = NoteStore::new(file.path().to_path_buf());
        assert_eq!(store.get_all().len(), 0);
    }
}
