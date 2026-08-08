import { AnimatedOutlet } from "./AnimatedOutlet";
import { MainNavBar } from "./MainNavBar";

export function AppShell() {
  return (
    <>
      <AnimatedOutlet />
      <MainNavBar />
    </>
  );
}
