import type React from "react";

export interface FieldProps {
	label: string;
	value: string;
	placeholder: string;
	type?: string;
	readOnly?: boolean;
	systemGenerated?: boolean;
	loading?: boolean;
	textarea?: boolean;
	onChange: (value: string) => void;
}

const Field: React.FC<FieldProps> = ({
	label,
	value,
	placeholder,
	type = "text",
	readOnly = false,
	systemGenerated = false,
	loading = false,
	textarea = false,
	onChange,
}) => {
	const baseInput = `
    w-full rounded-lg border px-3 text-theme-sm outline-none transition
    ${
      readOnly || systemGenerated
        ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-500"
        : `border-gray-200 bg-white text-gray-800 placeholder-gray-400
           focus:border-secondary focus:ring-2 focus:ring-secondary/20
           dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90
           dark:placeholder-gray-600 dark:focus:border-secondary`
    }
  `;

	const shimmerClass = loading
		? "relative overflow-hidden after:pointer-events-none after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent after:bg-[length:200%_100%]"
		: "";

	return (
		<div className="grid grid-cols-[180px_1fr] items-start gap-4">
			<div className="flex items-center gap-1.5 pt-2">
				<label className="text-theme-sm font-medium text-gray-600 dark:text-gray-400">
					{label}
				</label>
				{systemGenerated && (
					<span className="rounded bg-primary/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary/60 dark:bg-primary/10 dark:text-secondary/60">
						AUTO
					</span>
				)}
			</div>
			<div className={`${shimmerClass} rounded-lg`}>
				{textarea ? (
					<textarea
						value={value}
						placeholder={placeholder}
						readOnly={readOnly || systemGenerated}
						rows={3}
						onChange={(e) => onChange(e.target.value)}
						className={`${baseInput} resize-none py-2`}
					/>
				) : (
					<input
						type={type}
						value={value}
						placeholder={placeholder}
						readOnly={readOnly || systemGenerated}
						onChange={(e) => onChange(e.target.value)}
						className={`${baseInput} h-9`}
					/>
				)}
			</div>
		</div>
	);
};

export default Field;
