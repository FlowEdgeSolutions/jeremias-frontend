type ProjectNameParts = {
  productName: string;
  street?: string;
  zipCode?: string;
  city?: string;
  date?: Date;
};

const buildAddressPart = (street?: string, zipCode?: string, city?: string) => {
  const addressParts: string[] = [];
  const trimmedStreet = street?.trim();
  if (trimmedStreet) {
    addressParts.push(trimmedStreet);
  }

  const cityParts = [zipCode?.trim(), city?.trim()].filter(Boolean).join(" ");
  if (cityParts) {
    addressParts.push(cityParts);
  }

  return addressParts.join(" ");
};

export const formatProjectName = ({
  productName,
  street,
  zipCode,
  city,
  date = new Date(),
}: ProjectNameParts) => {
  const baseName = productName.trim();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const datePart = `${month}.${year}`;
  const addressPart = buildAddressPart(street, zipCode, city);
  const suffix = [addressPart, datePart].filter(Boolean).join(", ");

  return suffix ? `${baseName} [${suffix}]` : baseName;
};
