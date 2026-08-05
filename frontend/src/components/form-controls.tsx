/** フォーム部品。現場での誤タップを避けるため、高さ・文字を大きめに揃えている。 */

const fieldClass =
  "h-12 w-full rounded-xl border border-line bg-card-2 px-4 text-base text-fg placeholder:text-fg-faint focus:border-accent/60 focus:outline-none";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold text-fg-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs text-fg-faint">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${fieldClass} ${props.className ?? ""}`}>
      {props.children}
    </select>
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full rounded-xl border border-line bg-card-2 px-4 py-3 text-base text-fg placeholder:text-fg-faint focus:border-accent/60 focus:outline-none ${
        props.className ?? ""
      }`}
    />
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-accent text-ink hover:bg-accent-soft",
    secondary: "border border-line bg-card-2 text-fg hover:border-accent/50",
    danger: "border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20",
  } as const;

  return (
    <button
      {...props}
      className={`flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className ?? ""}`}
    />
  );
}
