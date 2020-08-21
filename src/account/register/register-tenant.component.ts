import { AfterViewInit, Component, Injector, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { accountModuleAnimation } from '@shared/animations/routerTransition';
import { AppConsts } from '@shared/AppConsts';
import { AppComponentBase } from '@shared/common/component-base';
import {
  EditionPaymentType,
  EditionSelectDto,
  PasswordComplexitySetting,
  PaymentPeriodType,
  ProfileServiceProxy,
  RegisterTenantOutput,
  SubscriptionPaymentGatewayType,
  SubscriptionStartType,
  TenantRegistrationServiceProxy
} from '@shared/service-proxies/service-proxies';
import { catchError, finalize } from 'rxjs/operators';
import { RegisterTenantModel } from './register-tenant.model';
import { TenantRegistrationHelperService } from './tenant-registration-helper.service';

@Component({
  templateUrl: './register-tenant.component.html',
  animations: [accountModuleAnimation()]
})
export class RegisterTenantComponent extends AppComponentBase implements OnInit, AfterViewInit {
  model: RegisterTenantModel = new RegisterTenantModel();
  passwordComplexitySetting: PasswordComplexitySetting = new PasswordComplexitySetting();
  subscriptionStartType = SubscriptionStartType;
  editionPaymentType: EditionPaymentType;
  paymentPeriodType = PaymentPeriodType;
  selectedPaymentPeriodType: PaymentPeriodType = PaymentPeriodType.Monthly;
  subscriptionPaymentGateway = SubscriptionPaymentGatewayType;
  paymentId = '';
  recaptchaSiteKey: string = AppConsts.recaptchaSiteKey;

  saving = false;

  constructor(
    injector: Injector,
    private _tenantRegistrationService: TenantRegistrationServiceProxy,
    private _router: Router,
    private _profileService: ProfileServiceProxy,
    private _tenantRegistrationHelper: TenantRegistrationHelperService,
    private _activatedRoute: ActivatedRoute
  ) {
    super(injector);
  }

  get useCaptcha(): boolean {
    return this.setting.getBoolean('App.TenantManagement.UseCaptchaOnRegistration');
  }

  ngOnInit() {
    this.model.editionId = this._activatedRoute.snapshot.queryParams.editionId;
    this.editionPaymentType = this._activatedRoute.snapshot.queryParams.editionPaymentType;

    if (this.model.editionId) {
      this.model.subscriptionStartType = this._activatedRoute.snapshot.queryParams.subscriptionStartType;
    }

    // Prevent to create tenant in a tenant context
    if (this.appSession.tenant != null) {
      this._router.navigate(['account/login']);
      return;
    }

    this._profileService.getPasswordComplexitySetting().subscribe(result => {
      this.passwordComplexitySetting = result.setting;
    });
  }

  ngAfterViewInit() {
    if (this.model.editionId) {
      this._tenantRegistrationService.getEdition(this.model.editionId).subscribe((result: EditionSelectDto) => {
        this.model.edition = result;
      });
    }
  }

  save(): void {
    if (this.useCaptcha && !this.model.captchaResponse) {
      this.message.warn(this.l('CaptchaCanNotBeEmpty'));
      return;
    }

    this.saving = true;
    this._tenantRegistrationService
      .registerTenant(this.model)
      .pipe(
        finalize(() => {
          this.saving = false;
        })
      )
      .pipe(
        catchError((err, caught): any => {
          // this.recaptchaRef.reset();
        })
      )
      .subscribe((result: RegisterTenantOutput) => {
        this.notify.success(this.l('SuccessfullyRegistered'));
        this._tenantRegistrationHelper.registrationResult = result;

        if (this.model.subscriptionStartType === SubscriptionStartType.Paid) {
          this._router.navigate(['account/buy'], {
            queryParams: {
              tenantId: result.tenantId,
              editionId: this.model.editionId,
              subscriptionStartType: this.model.subscriptionStartType,
              editionPaymentType: this.editionPaymentType
            }
          });
        } else {
          this._router.navigate(['account/register-tenant-result']);
        }
      });
  }

  captchaResolved(captchaResponse: string): void {
    this.model.captchaResponse = captchaResponse;
  }
}
