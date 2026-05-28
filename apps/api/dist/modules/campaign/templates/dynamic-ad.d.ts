import React from 'react';
export interface DynamicAdProps {
    logoUrl: string;
    brandColor: string;
    bgUrl?: string;
    primaryText: string;
    secondaryText: string;
    [key: string]: any;
}
export declare const DynamicAdTemplate: React.FC<DynamicAdProps>;
