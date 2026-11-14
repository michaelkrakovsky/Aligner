import { redirect } from "next/navigation";

// The proxy sends signed-out people to /login before this runs.
export default function Home() {
  redirect("/maps");
}
