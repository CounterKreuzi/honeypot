export interface User {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
}

export interface HoneyType {
  pricePerJar: any;
  id: string;
  name: string;
  description?: string;
  price?: string;
  price250?: number | null;
  price500?: number | null;
  price1000?: number | null;
  unit?: string;
  available: boolean;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export interface Beekeeper {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  photo?: string;
  latitude: string | number;
  longitude: string | number;
  address: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  openingHours?: OpeningHours | null;
  isActive: boolean;
  honeyTypes: HoneyType[];
  distance?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: User;
    beekeeper?: Partial<Beekeeper>;
  };
}

export interface BeekeepersResponse {
  success: boolean;
  data: Beekeeper[];
  count: number;
  searchParams?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}
