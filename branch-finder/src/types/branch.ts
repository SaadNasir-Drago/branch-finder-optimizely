export interface BranchRaw {
  _id: string;
  Name: string;
  Street: string;
  City: string;
  Country: string;
  CountryCode: string;
  ZipCode: string;
  Coordinates: string;
  Phone: string;
  Email: string;
}

export interface Branch extends BranchRaw {
  lat: number;
  lng: number;
  distance?: number; // Distance from user in km (when geolocation is available)
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface BranchQueryResponse {
  Branch: {
    total: number;
    items: BranchRaw[];
  };
}

export interface CountryOption {
  code: string;
  name: string;
  count: number;
}
