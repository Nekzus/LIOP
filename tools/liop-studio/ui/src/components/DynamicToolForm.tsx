import { Info } from "lucide-react";
import type React from "react";

export interface ToolSchemaProperty {
	type?: string;
	description?: string;
	enum?: string[];
	default?: unknown;
}

export interface ToolSchema {
	type?: string;
	properties?: Record<string, ToolSchemaProperty>;
	required?: string[];
}

export interface DynamicToolFormProps {
	toolName: string;
	// biome-ignore lint/suspicious/noExplicitAny: JSON Schema input
	schema?: any;
	// biome-ignore lint/suspicious/noExplicitAny: Form state values
	values: Record<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: Value update handler
	onChange: (field: string, val: any) => void;
	disabled?: boolean;
}

export const DynamicToolForm: React.FC<DynamicToolFormProps> = ({
	toolName,
	schema,
	values,
	onChange,
	disabled = false,
}) => {
	const properties: Record<string, ToolSchemaProperty> =
		schema?.properties || {};
	const requiredFields: string[] = schema?.required || [];
	const propKeys = Object.keys(properties);

	if (propKeys.length === 0) {
		return (
			<div className="p-4 rounded-lg bg-surface1/60 border border-border text-center space-y-2">
				<div className="inline-flex p-2 rounded-full bg-cyan-500/10 text-cyan-400">
					<Info className="h-4 w-4" />
				</div>
				<p className="text-xs text-zinc-300 font-medium">
					No parameters required
				</p>
				<p className="text-[11px] text-zinc-400">
					Tool <code className="font-mono text-cyan-300">{toolName}</code> does
					not require arguments.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3.5 p-4 rounded-lg bg-surface1/40 border border-border">
			<div className="flex items-center justify-between pb-2 border-b border-border/50 text-xs">
				<span className="font-semibold text-zinc-200">Schema Parameters</span>
				<span className="text-[10px] font-mono text-zinc-400">
					{propKeys.length} inputs
				</span>
			</div>

			<div className="space-y-3">
				{propKeys.map((key) => {
					const prop = properties[key] || {};
					const isRequired = requiredFields.includes(key);
					const type = prop.type || "string";
					const val = values[key] ?? "";

					return (
						<div key={key} className="space-y-1">
							<div className="flex items-center justify-between">
								<label
									htmlFor={`field-${key}`}
									className="text-xs font-mono font-medium text-zinc-200 flex items-center gap-1"
								>
									{key}
									{isRequired && (
										<span className="text-rose-400 font-bold">*</span>
									)}
									<span className="text-[10px] font-mono text-zinc-500 font-normal">
										({type})
									</span>
								</label>
								{prop.enum && (
									<span className="text-[9px] font-mono px-1 py-0.2 rounded bg-secondary text-zinc-400">
										enum: {prop.enum.length} options
									</span>
								)}
							</div>

							{prop.description && (
								<p className="text-[11px] text-zinc-400 leading-tight">
									{prop.description}
								</p>
							)}

							{prop.enum && Array.isArray(prop.enum) ? (
								<select
									id={`field-${key}`}
									value={String(val)}
									disabled={disabled}
									onChange={(e) => onChange(key, e.target.value)}
									className="w-full h-8 px-2.5 rounded border border-border bg-surface1 text-white text-xs focus:outline-none focus:border-primary"
								>
									<option value="">-- Select option --</option>
									{prop.enum.map((opt) => (
										<option key={opt} value={opt}>
											{opt}
										</option>
									))}
								</select>
							) : type === "boolean" ? (
								<select
									id={`field-${key}`}
									value={val === "" ? "" : String(val)}
									disabled={disabled}
									onChange={(e) => onChange(key, e.target.value === "true")}
									className="w-full h-8 px-2.5 rounded border border-border bg-surface1 text-white text-xs focus:outline-none focus:border-primary"
								>
									<option value="">-- Select boolean --</option>
									<option value="true">true</option>
									<option value="false">false</option>
								</select>
							) : type === "number" || type === "integer" ? (
								<input
									id={`field-${key}`}
									type="number"
									value={val}
									disabled={disabled}
									placeholder={prop.description || `Enter ${key}`}
									onChange={(e) =>
										onChange(
											key,
											e.target.value === "" ? "" : Number(e.target.value),
										)
									}
									className="w-full h-8 px-3 rounded border border-border bg-surface1 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-primary"
								/>
							) : (
								<input
									id={`field-${key}`}
									type="text"
									value={val}
									disabled={disabled}
									placeholder={prop.description || `Enter ${key}`}
									onChange={(e) => onChange(key, e.target.value)}
									className="w-full h-8 px-3 rounded border border-border bg-surface1 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-primary"
								/>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};
