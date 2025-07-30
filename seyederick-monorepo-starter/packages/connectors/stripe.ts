export async function stripeConnector(action: string, args: any) {
  if (action === "list-transactions") {
    return { status: "Stripe transactions synced." };
  }
  throw new Error("Unsupported action.");
}