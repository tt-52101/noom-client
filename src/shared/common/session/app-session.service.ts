import { AbpMultiTenancyService } from '@abp/multi-tenancy/abp-multi-tenancy.service';
import { Injectable } from '@angular/core';
import {
  ApplicationInfoDto,
  GetCurrentLoginInformationsOutput,
  SessionServiceProxy,
  TenantLoginInfoDto,
  UserLoginInfoDto,
} from '../../service-proxies/service-proxies';

@Injectable()
export class AppSessionService {
  constructor(private _sessionService: SessionServiceProxy, private _abpMultiTenancyService: AbpMultiTenancyService) { }

  private _user: UserLoginInfoDto;
  get user(): UserLoginInfoDto {
    return this._user;
  }

  private _tenant: TenantLoginInfoDto;
  get tenant(): TenantLoginInfoDto {
    return this._tenant;
  }

  private _application: ApplicationInfoDto;
  get application(): ApplicationInfoDto {
    return this._application;
  }

  get userId(): number {
    return this.user ? this.user.id : null;
  }

  get tenantId(): number {
    return this.tenant ? this.tenant.id : null;
  }

  get tenancyName(): string {
    return this._tenant ? this.tenant.tenancyName : '';
  }

  getShowLoginName(): string {
    const userName = this._user.userName;
    if (!this._abpMultiTenancyService.isEnabled) {
      return userName;
    }

    return (this._tenant ? this._tenant.tenancyName : '.') + '\\' + userName;
  }

  init(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this._sessionService
        .getCurrentLoginInformations()
        .toPromise()
        .then(
          (result: GetCurrentLoginInformationsOutput) => {
            this._application = result.application;
            this._user = result.user;
            this._tenant = result.tenant;

            resolve(true);
          },
          (err) => {
            reject(err);
          },
        );
    });
  }

  changeTenantIfNeeded(tenantId?: number): boolean {
    if (this.isCurrentTenant(tenantId)) {
      return false;
    }

    abp.multiTenancy.setTenantIdCookie(tenantId);
    location.reload();
    return true;
  }

  private isCurrentTenant(tenantId?: number) {

    const isTenant = tenantId > 0;

    if (!isTenant && !this.tenant) {
      // this is host
      return true;
    }

    if (!tenantId && this.tenant) {
      return false;
    } else if (tenantId && (!this.tenant || this.tenant.id !== tenantId)) {
      return false;
    }

    return true;
  }
}
