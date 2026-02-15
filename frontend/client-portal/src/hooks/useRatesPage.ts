import { useQuery } from "@tanstack/react-query";
import { ProductsApi } from "../apis/booking/products.api";
import type { RatesPageData } from "../pages/rates/types/rates.types";

export function useRatesPageData() {
  return useQuery<RatesPageData>({
    queryKey: ["rates-page"],
    queryFn: () => ProductsApi.getRatesPageData(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
