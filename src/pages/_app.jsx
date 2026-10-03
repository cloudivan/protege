import "@/styles/globals.css";
import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { Plus_Jakarta_Sans, DM_Sans } from "next/font/google";
import DashboardLayout from "@/components/Layout/DashboardLayout";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });

const DASHBOARD_ROUTE_PREFIXES = ["/workflows"];

const isDashboardRoute = (pathname) =>
  DASHBOARD_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Mirror the font variable classes onto <html> so portaled content
  // (toasts, modals) inherits the app fonts.
  useEffect(() => {
    const classes = ["app-fonts", jakarta.variable, dmSans.variable];
    const html = document.documentElement;
    html.classList.add(...classes);
    return () => html.classList.remove(...classes);
  }, []);

  const page = <Component {...pageProps} />;
  const content = isDashboardRoute(router.pathname) ? <DashboardLayout>{page}</DashboardLayout> : page;

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <title>Protégé</title>
      </Head>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <div className={`app-fonts ${jakarta.variable} ${dmSans.variable}`}>{content}</div>
        <Toaster
          position="top-center"
          offset={6}
          toastOptions={{
            style: {
              background: "hsl(var(--background))",
              color: "hsl(var(--foreground))",
              border: "1px solid hsl(var(--border))",
            },
          }}
        />
      </ThemeProvider>
    </>
  );
}

export default MyApp;
