declare class FileMetadataDto {
    name: string;
    size: number;
    type: string;
}
export declare class OnboardAdvertiserDto {
    name: string;
    companyName: string;
    email: string;
    phone: string;
    password?: string;
    budget: number;
    expectedScreens: number;
    targetCity: string;
    fileMetadata?: FileMetadataDto;
}
export {};
