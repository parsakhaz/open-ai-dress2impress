export function createCountdown(seconds: number, onTick: (s: number) => void, onDone: () => void) {
  let remaining = seconds;
  onTick(remaining);
  const interval = setInterval(() => {
    remaining -= 1;
    onTick(Math.max(remaining, 0));
    if (remaining <= 0) {
      clearInterval(interval);
      onDone();
    }
  }, 1000);
  return () => clearInterval(interval);
}


