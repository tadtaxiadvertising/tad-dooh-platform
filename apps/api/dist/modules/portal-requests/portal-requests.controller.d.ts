import { PortalRequestsService } from './portal-requests.service';
export declare class PortalRequestsController {
    private readonly portalRequestsService;
    constructor(portalRequestsService: PortalRequestsService);
    create(body: any): Promise<any>;
    findAll(): Promise<any>;
    findByAdvertiser(advertiserId: string): Promise<any>;
    findByDriver(driverId: string): Promise<any>;
    findOne(id: string): Promise<any>;
    update(id: string, body: any): Promise<any>;
    delete(id: string): Promise<any>;
}
