export function calculateFare(distance, rate) {

  const km = Number(distance);
  const price = Number(rate);

  if (!Number.isFinite(km) || km < 0) {
    throw new Error("Invalid distance");
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Invalid rate");
  }

  return Number((km * price).toFixed(2));
}