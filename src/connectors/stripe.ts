export async function stripeConnector(action: string, _args: unknown) {
  if (action === "list-transactions") {
    return { status: "Stripe transactions synced." };
  }
  throw new Error("Unsupported action.");
}