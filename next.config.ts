import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/cyberseguranca", destination: "/", permanent: true },
      { source: "/calculadora-reforma-tributaria", destination: "/", permanent: true },
      { source: "/cbs-ibs-contadores", destination: "/", permanent: true },
      { source: "/cobertura", destination: "/produto", permanent: true },
      { source: "/conteudos/:path*", destination: "/produto", permanent: true },
      { source: "/icms-st-contadores", destination: "/", permanent: true },
      { source: "/inteligencia-tributaria-escritorios", destination: "/", permanent: true },
      { source: "/metodologia", destination: "/seguranca#metodologia", permanent: true },
      { source: "/planos", destination: "/precos", permanent: true },
      { source: "/relatorios-fiscais-rastreaveis", destination: "/", permanent: true },
      { source: "/imprensa", destination: "/", permanent: false },
      { source: "/experimentar", destination: "/#diagnostico", permanent: false },
      { source: "/dossie/:path*", destination: "/", permanent: false },
      { source: "/fechamento/:path*", destination: "/", permanent: false },
      { source: "/relatorio/:path*", destination: "/", permanent: false },
      { source: "/relatorio-fiscal/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
