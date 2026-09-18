import { redirect } from "next/navigation";

/** Everything in this workspace lives under `/app`. */
export default function Home() {
  redirect("/app");
}
