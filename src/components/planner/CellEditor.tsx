import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { Card } from "@/components/ui/Card";
import { validatePlacement, firstNotableIssue, resolveIssueParams } from "@/lib/placementValidation";
import type { Bed, CellPlanting } from "@/types/garden";

interface Props {
  gardenId: string;
  bed: Bed;
  cell: CellPlanting;
  variant: "sidebar" | "sheet";
  onClose: () => void;
}

export function CellEditor({ gardenId, bed, cell, variant, onClose }: Props) {
  const { t } = useTranslation();
  const plantMap = usePlantMap();
  const getPlantName = usePlantName();
  const { updateCell, gridCellSizeCm } = useStore(
    useShallow((s) => ({ updateCell: s.updateCell, gridCellSizeCm: s.gridCellSizeCm }))
  );

  const update = (updates: Partial<CellPlanting>) =>
    updateCell(gardenId, bed.id, cell.cellX, cell.cellY, updates);

  // Shown even when overridden, so the gardener can see what they accepted.
  const issue = firstNotableIssue(validatePlacement(cell.plantId, cell.cellX, cell.cellY, bed, plantMap, gridCellSizeCm));
  const warning = issue ? t(issue.messageKey, resolveIssueParams(issue.messageParams, getPlantName)) : null;

  const sheet = variant === "sheet";
  const inputClass = sheet
    ? "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base dark:border-gray-600 dark:bg-gray-900"
    : "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800";

  const body = (
    <>
      <h3 className="mb-3 text-sm font-semibold">{t("planner.editCell")}</h3>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-gray-500">{t("planner.variety")}</label>
          <input
            type="text"
            value={cell.variety ?? ""}
            onChange={(e) => update({ variety: e.target.value || undefined })}
            placeholder={t("planner.varietyPlaceholder")}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">{t("planner.plantedDate")}</label>
          <input
            type="date"
            value={cell.plantedDate ?? ""}
            onChange={(e) => update({ plantedDate: e.target.value || undefined })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">{t("harvest.notes")}</label>
          <textarea
            value={cell.notes ?? ""}
            onChange={(e) => update({ notes: e.target.value || undefined })}
            rows={2}
            className={inputClass}
          />
        </div>

        {warning && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 dark:border-amber-800/60 dark:bg-amber-900/20">
            <p className="mb-2 flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle size={13} className="mt-px shrink-0" />
              <span>{warning}</span>
            </p>
            <label className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
              <input
                type="checkbox"
                checked={!!cell.overrideWarnings}
                onChange={(e) => update({ overrideWarnings: e.target.checked || undefined })}
                className="accent-amber-600"
              />
              {t("planner.keepAnyway")}
            </label>
          </div>
        )}

        {sheet ? (
          <button onClick={onClose} className="w-full rounded-lg bg-garden-600 px-4 py-2 text-sm font-medium text-white">
            {t("common.close")}
          </button>
        ) : (
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">
            {t("common.close")}
          </button>
        )}
      </div>
    </>
  );

  return sheet ? (
    <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">{body}</div>
  ) : (
    <Card>{body}</Card>
  );
}
