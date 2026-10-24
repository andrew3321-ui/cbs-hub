export const ENHANCED_PASSIVE_VERSION = "enhanced-passive.v1";

export type EnhancedCheckCategory = "reconnaissance" | "exposure" | "infrastructure" | "website";

export type SensitivePathEntry = {
  path: string;
  code: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  category: EnhancedCheckCategory;
};

export type TechSignature = {
  source: "header" | "meta" | "cookie" | "url" | "body";
  pattern: RegExp;
  technology: string;
  category: string;
};

export const SUBDOMAIN_PREFIXES = [
  "www", "mail", "ftp", "admin", "dev", "staging", "api", "app",
  "cdn", "beta", "test", "demo", "portal", "secure", "vpn", "remote",
  "webmail", "smtp", "pop", "imap", "ns1", "ns2", "blog",
  "shop", "store", "dashboard", "panel", "cms", "git", "ci",
  "jira", "confluence", "wiki", "docs", "status", "monitor",
  "grafana", "kibana", "elastic", "redis", "db", "backup",
  "old", "legacy", "uat", "qa", "sandbox", "internal",
  "sso", "auth", "login", "accounts", "id", "oauth",
  "assets", "static", "media", "images", "files", "upload",
  "ws", "socket", "realtime", "mq", "queue",
] as const;

export const SENSITIVE_PATHS: SensitivePathEntry[] = [
  // Version control exposure
  { path: "/.git/HEAD", code: "git-exposure", severity: "critical", title: "Repositório Git exposto", category: "exposure" },
  { path: "/.git/config", code: "git-config-exposure", severity: "critical", title: "Configuração Git exposta", category: "exposure" },
  { path: "/.svn/entries", code: "svn-exposure", severity: "critical", title: "Repositório SVN exposto", category: "exposure" },
  { path: "/.hg/dirstate", code: "hg-exposure", severity: "critical", title: "Repositório Mercurial exposto", category: "exposure" },

  // Environment / Config files
  { path: "/.env", code: "env-file-exposure", severity: "critical", title: "Arquivo .env exposto", category: "exposure" },
  { path: "/.env.local", code: "env-file-exposure", severity: "critical", title: "Arquivo .env.local exposto", category: "exposure" },
  { path: "/.env.production", code: "env-file-exposure", severity: "critical", title: "Arquivo .env.production exposto", category: "exposure" },
  { path: "/.env.backup", code: "env-file-exposure", severity: "critical", title: "Arquivo .env.backup exposto", category: "exposure" },
  { path: "/config.json", code: "config-file-exposure", severity: "high", title: "Configuração JSON exposta", category: "exposure" },
  { path: "/config.yml", code: "config-file-exposure", severity: "high", title: "Configuração YAML exposta", category: "exposure" },
  { path: "/config.yaml", code: "config-file-exposure", severity: "high", title: "Configuração YAML exposta", category: "exposure" },
  { path: "/wp-config.php.bak", code: "config-backup-exposure", severity: "critical", title: "Backup de configuração WordPress exposto", category: "exposure" },

  // Server status and info
  { path: "/server-status", code: "server-status-exposure", severity: "high", title: "Apache server-status exposto", category: "infrastructure" },
  { path: "/server-info", code: "server-info-exposure", severity: "high", title: "Apache server-info exposto", category: "infrastructure" },
  { path: "/nginx_status", code: "nginx-status-exposure", severity: "high", title: "Nginx status exposto", category: "infrastructure" },

  // Debug endpoints
  { path: "/debug", code: "debug-endpoint", severity: "high", title: "Endpoint de debug acessível", category: "exposure" },
  { path: "/_debug", code: "debug-endpoint", severity: "high", title: "Endpoint de debug acessível", category: "exposure" },
  { path: "/_profiler", code: "profiler-exposure", severity: "high", title: "Profiler exposto", category: "exposure" },
  { path: "/trace", code: "trace-endpoint", severity: "high", title: "Endpoint de trace acessível", category: "exposure" },
  { path: "/actuator", code: "actuator-exposure", severity: "high", title: "Spring Actuator exposto", category: "exposure" },
  { path: "/actuator/env", code: "actuator-env-exposure", severity: "critical", title: "Spring Actuator env exposto", category: "exposure" },
  { path: "/actuator/health", code: "actuator-health", severity: "low", title: "Spring Actuator health acessível", category: "infrastructure" },
  { path: "/phpinfo.php", code: "phpinfo-exposure", severity: "high", title: "phpinfo() exposto", category: "exposure" },
  { path: "/info.php", code: "phpinfo-exposure", severity: "high", title: "phpinfo() exposto", category: "exposure" },
  { path: "/elmah.axd", code: "error-log-exposure", severity: "high", title: "Log de erros ELMAH exposto", category: "exposure" },

  // API documentation
  { path: "/swagger.json", code: "api-docs-exposure", severity: "medium", title: "Swagger JSON exposto", category: "exposure" },
  { path: "/swagger/v1/swagger.json", code: "api-docs-exposure", severity: "medium", title: "Swagger JSON exposto", category: "exposure" },
  { path: "/swagger-ui.html", code: "api-docs-exposure", severity: "medium", title: "Swagger UI exposto", category: "exposure" },
  { path: "/swagger-ui/", code: "api-docs-exposure", severity: "medium", title: "Swagger UI exposto", category: "exposure" },
  { path: "/openapi.json", code: "api-docs-exposure", severity: "medium", title: "OpenAPI spec exposta", category: "exposure" },
  { path: "/openapi.yaml", code: "api-docs-exposure", severity: "medium", title: "OpenAPI spec exposta", category: "exposure" },
  { path: "/api-docs", code: "api-docs-exposure", severity: "medium", title: "Documentação de API exposta", category: "exposure" },
  { path: "/graphql", code: "graphql-introspection", severity: "medium", title: "Endpoint GraphQL acessível", category: "exposure" },
  { path: "/graphiql", code: "graphql-introspection", severity: "medium", title: "GraphiQL IDE exposta", category: "exposure" },

  // Admin panels
  { path: "/admin", code: "admin-panel-exposure", severity: "medium", title: "Painel administrativo acessível", category: "exposure" },
  { path: "/admin/", code: "admin-panel-exposure", severity: "medium", title: "Painel administrativo acessível", category: "exposure" },
  { path: "/wp-admin/", code: "wp-admin-exposure", severity: "medium", title: "WordPress admin acessível", category: "exposure" },
  { path: "/wp-login.php", code: "wp-login-exposure", severity: "medium", title: "WordPress login exposto", category: "exposure" },
  { path: "/administrator/", code: "admin-panel-exposure", severity: "medium", title: "Painel Joomla acessível", category: "exposure" },
  { path: "/wp-json/wp/v2/users", code: "wp-user-enum", severity: "high", title: "Enumeração de usuários WordPress", category: "exposure" },

  // Sensitive files
  { path: "/.DS_Store", code: "directory-listing", severity: "medium", title: "Listagem de diretório exposta (.DS_Store)", category: "exposure" },
  { path: "/crossdomain.xml", code: "crossdomain-policy", severity: "low", title: "crossdomain.xml presente", category: "website" },
  { path: "/.htaccess", code: "htaccess-exposure", severity: "high", title: "Arquivo .htaccess exposto", category: "exposure" },
  { path: "/.htpasswd", code: "htpasswd-exposure", severity: "critical", title: "Arquivo .htpasswd exposto", category: "exposure" },
  { path: "/backup.sql", code: "database-backup-exposure", severity: "critical", title: "Backup de banco de dados exposto", category: "exposure" },
  { path: "/dump.sql", code: "database-backup-exposure", severity: "critical", title: "Dump de banco de dados exposto", category: "exposure" },
  { path: "/database.sql", code: "database-backup-exposure", severity: "critical", title: "Backup de banco de dados exposto", category: "exposure" },

  // Security.txt
  { path: "/.well-known/security.txt", code: "security-txt", severity: "low", title: "security.txt", category: "website" },

  // Error pages that leak info
  { path: "/error", code: "error-page-disclosure", severity: "low", title: "Página de erro personalizada", category: "infrastructure" },
  { path: "/404", code: "error-page-disclosure", severity: "low", title: "Página 404 personalizada", category: "infrastructure" },
];

export const TECH_HEADER_SIGNATURES: TechSignature[] = [
  // Server
  { source: "header", pattern: /^apache/i, technology: "Apache", category: "web-server" },
  { source: "header", pattern: /^nginx/i, technology: "Nginx", category: "web-server" },
  { source: "header", pattern: /^cloudflare/i, technology: "Cloudflare", category: "cdn" },
  { source: "header", pattern: /^microsoft-iis/i, technology: "IIS", category: "web-server" },
  { source: "header", pattern: /^litespeed/i, technology: "LiteSpeed", category: "web-server" },
  { source: "header", pattern: /^openresty/i, technology: "OpenResty", category: "web-server" },
  { source: "header", pattern: /^envoy/i, technology: "Envoy", category: "proxy" },
  { source: "header", pattern: /^caddy/i, technology: "Caddy", category: "web-server" },

  // Frameworks via X-Powered-By
  { source: "header", pattern: /^express$/i, technology: "Express.js", category: "framework" },
  { source: "header", pattern: /^php/i, technology: "PHP", category: "runtime" },
  { source: "header", pattern: /^asp\.net/i, technology: "ASP.NET", category: "framework" },
  { source: "header", pattern: /^next\.js/i, technology: "Next.js", category: "framework" },
  { source: "header", pattern: /^nuxt/i, technology: "Nuxt", category: "framework" },
  { source: "header", pattern: /^django/i, technology: "Django", category: "framework" },
  { source: "header", pattern: /^flask/i, technology: "Flask", category: "framework" },
  { source: "header", pattern: /^ruby/i, technology: "Ruby", category: "runtime" },
  { source: "header", pattern: /^kestrel/i, technology: "Kestrel", category: "web-server" },
  { source: "header", pattern: /^gunicorn/i, technology: "Gunicorn", category: "web-server" },
  { source: "header", pattern: /^uvicorn/i, technology: "Uvicorn", category: "web-server" },
  { source: "header", pattern: /^phusion passenger/i, technology: "Passenger", category: "web-server" },
  { source: "header", pattern: /^jetty/i, technology: "Jetty", category: "web-server" },
  { source: "header", pattern: /^cowboy/i, technology: "Cowboy (Erlang)", category: "web-server" },

  // CDNs via headers
  { source: "header", pattern: /^hit|^miss/i, technology: "Varnish", category: "cache" },
  { source: "header", pattern: /^akamai/i, technology: "Akamai", category: "cdn" },
  { source: "header", pattern: /^fastly/i, technology: "Fastly", category: "cdn" },
  { source: "header", pattern: /^amazon/i, technology: "AWS CloudFront", category: "cdn" },
  { source: "header", pattern: /^vercel/i, technology: "Vercel", category: "platform" },
  { source: "header", pattern: /^netlify/i, technology: "Netlify", category: "platform" },
];

export const TECH_BODY_SIGNATURES: TechSignature[] = [
  { source: "body", pattern: /wp-content|wp-includes/i, technology: "WordPress", category: "cms" },
  { source: "body", pattern: /\/sites\/default\/files\//i, technology: "Drupal", category: "cms" },
  { source: "body", pattern: /\/media\/jui\//i, technology: "Joomla", category: "cms" },
  { source: "body", pattern: /Shopify\.theme/i, technology: "Shopify", category: "ecommerce" },
  { source: "body", pattern: /cdn\.shopify\.com/i, technology: "Shopify", category: "ecommerce" },
  { source: "body", pattern: /__next/i, technology: "Next.js", category: "framework" },
  { source: "body", pattern: /__nuxt/i, technology: "Nuxt", category: "framework" },
  { source: "body", pattern: /ng-version=/i, technology: "Angular", category: "framework" },
  { source: "body", pattern: /react/i, technology: "React", category: "framework" },
  { source: "body", pattern: /vue/i, technology: "Vue.js", category: "framework" },
  { source: "body", pattern: /<meta[^>]+generator[^>]+wordpress/i, technology: "WordPress", category: "cms" },
  { source: "body", pattern: /<meta[^>]+generator[^>]+joomla/i, technology: "Joomla", category: "cms" },
  { source: "body", pattern: /<meta[^>]+generator[^>]+drupal/i, technology: "Drupal", category: "cms" },
  { source: "body", pattern: /<meta[^>]+generator[^>]+wix/i, technology: "Wix", category: "platform" },
  { source: "body", pattern: /<meta[^>]+generator[^>]+squarespace/i, technology: "Squarespace", category: "platform" },
  { source: "body", pattern: /jquery[.-](\d+\.\d+)/i, technology: "jQuery", category: "library" },
  { source: "body", pattern: /bootstrap[.-](\d+)/i, technology: "Bootstrap", category: "library" },
  { source: "body", pattern: /google-analytics|gtag|UA-\d{4,}/i, technology: "Google Analytics", category: "analytics" },
  { source: "body", pattern: /googletagmanager/i, technology: "Google Tag Manager", category: "analytics" },
  { source: "body", pattern: /hotjar/i, technology: "Hotjar", category: "analytics" },
  { source: "body", pattern: /recaptcha/i, technology: "reCAPTCHA", category: "security" },
  { source: "body", pattern: /hcaptcha/i, technology: "hCaptcha", category: "security" },
  { source: "body", pattern: /cloudflare/i, technology: "Cloudflare", category: "cdn" },
];

export const CSP_DANGEROUS_DIRECTIVES = [
  { pattern: "'unsafe-inline'", directive: "script-src", severity: "high" as const, detail: "Permite execução de scripts inline, facilitando XSS." },
  { pattern: "'unsafe-eval'", directive: "script-src", severity: "high" as const, detail: "Permite eval() e funções similares, ampliando superfície de XSS." },
  { pattern: "data:", directive: "script-src", severity: "high" as const, detail: "Permite scripts via data: URIs." },
  { pattern: "*", directive: "default-src", severity: "medium" as const, detail: "Wildcard em default-src anula a maior parte da proteção CSP." },
  { pattern: "*", directive: "script-src", severity: "high" as const, detail: "Wildcard em script-src permite carregar scripts de qualquer origem." },
  { pattern: "http:", directive: "default-src", severity: "medium" as const, detail: "Permite carga de recursos via HTTP inseguro." },
];

export const ENHANCED_PASSIVE_LIMITATION = "Varredura passiva aprimorada: requisições HEAD a caminhos conhecidos, consultas DNS a prefixos comuns e análise de Certificate Transparency. Não executa exploração, injeção, força bruta, escaneamento de portas ou qualquer teste que altere estado no alvo. Resultados devem ser correlacionados e validados por profissional qualificado.";

export const MAX_SUBDOMAIN_DNS_QUERIES = 50;
export const MAX_PATH_PROBES = 55;
export const ENHANCED_FETCH_TIMEOUT_MS = 5_000;
