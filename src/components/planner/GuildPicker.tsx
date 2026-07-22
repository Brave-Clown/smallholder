import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { GUILDS, type PlantGuild } from "@/data/guilds";
import { tileGuild, guildFitsBed } from "@/lib/guildFill";
import type { Bed, CellPlanting } from "@/types/garden";

interface Props {
  bed: Bed;
  onApply: (guild: PlantGuild, cells: CellPlanting[]) => void;
}

export function GuildPicker({ bed, onApply }: Props) {
  const { t } = useTranslation();

  const availableGuilds = GUILDS.filter((g) => guildFitsBed(g, bed));

  if (availableGuilds.length === 0) return null;

  return (
    <div className="mb-2 border-b border-gray-100 pb-2 dark:border-gray-800">
      <p className="mb-1.5 flex items-center gap-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        <Sparkles size={11} />
        {t("guilds.title")}
      </p>
      <div className="mb-1.5 flex flex-wrap gap-1 px-1">
        {availableGuilds.map((guild) => (
          <button
            key={guild.id}
            onClick={() => onApply(guild, tileGuild(guild, bed))}
            title={t(guild.descriptionKey)}
            className="flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs transition-colors hover:border-garden-400 hover:bg-garden-50 dark:border-gray-700 dark:hover:border-garden-600 dark:hover:bg-garden-900/20"
          >
            <span>{guild.icon}</span>
            {t(guild.nameKey)}
          </button>
        ))}
      </div>
      <p className="px-2 text-[10px] text-gray-400">{t("guilds.tileHint")}</p>
    </div>
  );
}
