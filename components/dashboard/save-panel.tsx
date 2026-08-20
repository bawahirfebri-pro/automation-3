import SaveSection from "@/components/save-section";

interface SavePanelProps {
  saving: boolean;
  saveMessage: string;
  hasData: boolean;
  warnings: string[];
  onSave: () => void | Promise<void>;
}

export default function SavePanel({
  saving,
  saveMessage,
  hasData,
  warnings,
  onSave,
}: SavePanelProps) {
  return (
    <section className="col-span-12">
      <SaveSection
        saving={saving}
        saveMessage={saveMessage}
        onSave={onSave}
        hasData={hasData}
        warnings={warnings}
      />
    </section>
  );
}