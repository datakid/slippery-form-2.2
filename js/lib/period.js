export function suggestedPeriod(now = new Date()) {
    const early = now.getDate() <= 20;
    const month = early ? ((now.getMonth() + 11) % 12) + 1 : now.getMonth() + 1;
    const year = early && now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return { year, month };
}
