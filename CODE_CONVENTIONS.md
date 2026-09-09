# Code Conventions

Convention ini berlaku untuk codebase `automation-3` dan digunakan sebagai standar utama untuk penulisan, refactor, dan penambahan kode baru.

Tujuan utama:

- menjaga kode konsisten;
- mempermudah review;
- mengurangi keputusan style manual;
- mencegah refactor yang mengubah business process tanpa sengaja.

---

## 1. File Naming

Gunakan `kebab-case`.

```text
components/ → kebab-case.tsx
hooks/      → use-kebab-case.ts
lib/        → kebab-case.ts
types/      → kebab-case.ts
tests/      → <source-name>.test.ts
```

## Logical Block Spacing

Gunakan satu blank line untuk memisahkan kelompok statement dengan responsibility berbeda.

Contoh:

```ts
const { history, addOrUpdateHistory, markAsSaved } = useExtractionHistory();
const { students, loadingStudents, studentError, refreshStudents } = useStudents();
const { saving: savingAll, save, saveMany } = useStudentSave();
const { files, clearFiles, replaceFiles } = useDocumentFiles();

const historyMap = useMemo(() => new Map(history.map((item) => [item.id, item])), [history]);
const historyRef = useRef(history);

useEffect(() => {
  historyRef.current = history;
}, [history]);

const currentFileKeys = useMemo(() => files.map((file) => getDocumentFileKey(file)), [files]);
const currentFileKeySet = useMemo(() => new Set(currentFileKeys), [currentFileKeys]);
```
