import { apiClient } from "@/lib/apiClient";

/** The AI reads a booking email and its files into shipment values. Nothing is saved; each call is a paid AI request. */
export async function readBooking(body: IBookingIntakeRequest) {
  const { data } = await apiClient.post<IBookingIntake>(
    "/bookings/intake",
    body,
  );
  return data;
}
