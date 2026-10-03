import Link from "next/link";
import { Eye, Map, GraduationCap } from "lucide-react";
import { Logo } from "@/components/Logo";

const MODULES = [
  { Icon: Eye, title: "Capture", text: "Share your screen and work. Protégé stays quiet, then asks why at the right pause." },
  { Icon: Map, title: "Map", text: "A short spoken debrief turns the session into a clickable Work Map with guardrails." },
  { Icon: GraduationCap, title: "Teach", text: "A voice tutor coaches the next hire on their own screen, in the expert's words." },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <Link href="/workflows" className="btn btn-secondary">Open app</Link>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="font-display text-4xl font-black tracking-tight sm:text-6xl">
          The apprentice that learns<br />what your experts never wrote down.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Protégé watches how screen work is really done, asks why, maps the workflow with its guardrails and teaches it to the next generation.
        </p>
        <Link href="/workflows/new" className="btn btn-primary mt-8">Capture a workflow</Link>
        <div className="mt-20 grid gap-4 sm:grid-cols-3">
          {MODULES.map(({ Icon, title, text }) => (
            <div key={title} className="card p-6">
              <Icon className="h-6 w-6 text-primary-400" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
