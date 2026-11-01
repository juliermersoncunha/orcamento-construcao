// Logo da JCunha no topo dos relatórios. `print-color-adjust` mantém a arte
// no papel, que por padrão o navegador imprime sem cor de fundo.

export function RelatorioLogo({ className = "" }: { className?: string }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- arquivo estático em /public, sem otimização */
    <img
      src="/logo-jcunha.webp"
      alt="JCunha Construtora"
      className={`h-20 w-auto print:h-[2.2cm] print:[print-color-adjust:exact] ${className}`}
    />
  );
}
