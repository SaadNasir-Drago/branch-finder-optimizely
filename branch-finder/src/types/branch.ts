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
