export interface Beekeeper {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  logo?: string;
  photo?: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  zipCode: string;
  openingHours?: string;
  honeyTypes: string[];
  priceRange?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BeekeeperWithDistance extends Beekeeper {
  distance: number;
}
