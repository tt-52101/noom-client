import { TokenService } from '@abp/auth/token.service';
import { LogService } from '@abp/log/log.service';
import { MessageService } from '@abp/message/message.service';
import { UtilsService } from '@abp/utils/utils.service';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AppConsts } from '@shared/AppConsts';
import { UrlHelper } from '@shared/helpers/UrlHelper';
import {
  AuthenticateModel,
  AuthenticateResultModel,
  ExternalAuthenticateModel,
  ExternalAuthenticateResultModel,
  ExternalLoginProviderInfoModel,
  TokenAuthServiceProxy,
} from '@shared/service-proxies/service-proxies';
// import { ScriptLoaderService } from '@shared/utils/script-loader.service';
// import * as AuthenticationContext from 'adal-angular/lib/adal';
// import { AuthConfig, OAuthService } from 'angular-oauth2-oidc';
import * as _ from 'lodash';
// import { NgxSpinnerService } from 'ngx-spinner';
import { finalize } from 'rxjs/operators';

declare const FB: any; // Facebook API
declare const gapi: any; // Facebook API
declare const WL: any; // Microsoft API

export class ExternalLoginProvider extends ExternalLoginProviderInfoModel {
  static readonly FACEBOOK: string = 'Facebook';
  static readonly GOOGLE: string = 'Google';
  static readonly MICROSOFT: string = 'Microsoft';
  static readonly OPENID: string = 'OpenIdConnect';
  static readonly WSFEDERATION: string = 'WsFederation';

  icon: string;
  initialized = false;

  constructor(providerInfo: ExternalLoginProviderInfoModel) {
    super();

    this.name = providerInfo.name;
    this.clientId = providerInfo.clientId;
    this.additionalParams = providerInfo.additionalParams;
    this.icon = providerInfo.name.toLowerCase();
  }
}

@Injectable()
export class LoginService {
  static readonly twoFactorRememberClientTokenName = 'TwoFactorRememberClientToken';
  authenticateModel: AuthenticateModel;
  authenticateResult: AuthenticateResultModel;
  externalLoginProviders: ExternalLoginProvider[] = [];
  rememberMe: boolean;
  wsFederationAuthenticationContext: any;

  constructor(
    private _tokenAuthService: TokenAuthServiceProxy,
    private _router: Router,
    private _utilsService: UtilsService,
    private _messageService: MessageService,
    private _tokenService: TokenService,
    private _logService: LogService, // private oauthService: OAuthService,
  ) // private spinnerService: NgxSpinnerService,
  {
    this.clear();
  }

  // private static getOpenIdConnectConfig(loginProvider: ExternalLoginProvider): AuthConfig {
  //   const authConfig = new AuthConfig();
  //   authConfig.loginUrl = loginProvider.additionalParams.LoginUrl;
  //   authConfig.issuer = loginProvider.additionalParams.Authority;
  //   authConfig.skipIssuerCheck = loginProvider.additionalParams.ValidateIssuer === 'false';
  //   authConfig.clientId = loginProvider.clientId;
  //   authConfig.responseType = 'id_token';
  //   authConfig.redirectUri = window.location.origin + '/account/login';
  //   authConfig.scope = 'openid profile';
  //   authConfig.requestAccessToken = false;
  //   return authConfig;
  // }

  authenticate(finallyCallback?: () => void, redirectUrl?: string, captchaResponse?: string): void {
    finallyCallback =
      finallyCallback ||
      (() => {
        // noinspection JSIgnoredPromiseFromCall
        // this.spinnerService.hide();
      });

    // We may switch to localStorage instead of cookies
    this.authenticateModel.twoFactorRememberClientToken = this._utilsService.getCookieValue(LoginService.twoFactorRememberClientTokenName);
    this.authenticateModel.singleSignIn = UrlHelper.getSingleSignIn();
    this.authenticateModel.returnUrl = UrlHelper.getReturnUrl();
    this.authenticateModel.captchaResponse = captchaResponse;

    this._tokenAuthService.authenticate(this.authenticateModel).subscribe({
      next: (result: AuthenticateResultModel) => {
        debugger;
        this.processAuthenticateResult(result, redirectUrl);
        finallyCallback();
      },
      error: (err: any) => {
        finallyCallback();
      },
    });
  }

  // externalAuthenticate(provider: ExternalLoginProvider): void {
  //   this.ensureExternalLoginProviderInitialized(provider, () => {
  //     if (provider.name === ExternalLoginProvider.FACEBOOK) {
  //       FB.login(
  //         (response) => {
  //           this.facebookLoginStatusChangeCallback(response);
  //         },
  //         { scope: 'email' },
  //       );
  //     } else if (provider.name === ExternalLoginProvider.GOOGLE) {
  //       gapi.auth2
  //         .getAuthInstance()
  //         .signIn()
  //         .then(() => {
  //           this.googleLoginStatusChangeCallback(gapi.auth2.getAuthInstance().isSignedIn.get());
  //         });
  //     } else if (provider.name === ExternalLoginProvider.MICROSOFT) {
  //       WL.login({
  //         scope: ['wl.signin', 'wl.basic', 'wl.emails'],
  //       });
  //     }
  //   });
  // }

  init(): void {
    this.initExternalLoginProviders();
  }

  // ensureExternalLoginProviderInitialized(loginProvider: ExternalLoginProvider, callback: () => void) {
  //   if (loginProvider.initialized) {
  //     callback();
  //     return;
  //   }

  //   if (loginProvider.name === ExternalLoginProvider.FACEBOOK) {
  //     new ScriptLoaderService().load('//connect.facebook.net/en_US/sdk.js').then(() => {
  //       FB.init({
  //         appId: loginProvider.clientId,
  //         cookie: false,
  //         xfbml: true,
  //         version: 'v2.5',
  //       });

  //       FB.getLoginStatus((response) => {
  //         this.facebookLoginStatusChangeCallback(response);
  //         if (response.status !== 'connected') {
  //           callback();
  //         }
  //       });
  //     });
  //   } else if (loginProvider.name === ExternalLoginProvider.GOOGLE) {
  //     new ScriptLoaderService().load('https://apis.google.com/js/api.js').then(() => {
  //       gapi.load('client:auth2', () => {
  //         gapi.client
  //           .init({
  //             clientId: loginProvider.clientId,
  //             scope: 'openid profile email',
  //           })
  //           .then(() => {
  //             callback();
  //           });
  //       });
  //     });
  //   } else if (loginProvider.name === ExternalLoginProvider.MICROSOFT) {
  //     new ScriptLoaderService().load('//js.live.net/v5.0/wl.js').then(() => {
  //       WL.Event.subscribe('auth.login', this.microsoftLogin);
  //       WL.init({
  //         client_id: loginProvider.clientId,
  //         scope: ['wl.signin', 'wl.basic', 'wl.emails'],
  //         redirect_uri: AppConsts.appBaseUrl,
  //         response_type: 'token',
  //       });
  //     });
  //   } else if (loginProvider.name === ExternalLoginProvider.OPENID) {
  //     const authConfig = LoginService.getOpenIdConnectConfig(loginProvider);
  //     this.oauthService.configure(authConfig);
  //     this.oauthService.initImplicitFlow('openIdConnect=1');
  //   } else if (loginProvider.name === ExternalLoginProvider.WSFEDERATION) {
  //     const config = this.getWsFederationConnectConfig(loginProvider);
  //     this.wsFederationAuthenticationContext = new AuthenticationContext(config);
  //     this.wsFederationAuthenticationContext.login();
  //   }
  // }

  // public openIdConnectLoginCallback(resp) {
  //   this.initExternalLoginProviders(() => {
  //     const openIdProvider = _.filter(this.externalLoginProviders, { name: 'OpenIdConnect' })[0];
  //     const authConfig = LoginService.getOpenIdConnectConfig(openIdProvider);

  //     this.oauthService.configure(authConfig);

  //     this.spinnerService.show();

  //     this.oauthService.tryLogin().then(() => {
  //       const claims = this.oauthService.getIdentityClaims();

  //       const model = new ExternalAuthenticateModel();
  //       model.authProvider = ExternalLoginProvider.OPENID;
  //       model.providerAccessCode = this.oauthService.getIdToken();
  //       model.providerKey = (claims as any).sub;
  //       model.singleSignIn = UrlHelper.getSingleSignIn();
  //       model.returnUrl = UrlHelper.getReturnUrl();

  //       this._tokenAuthService
  //         .externalAuthenticate(model)
  //         .pipe(
  //           finalize(() => {
  //             this.spinnerService.hide();
  //           }),
  //         )
  //         .subscribe((result: ExternalAuthenticateResultModel) => {
  //           if (result.waitingForActivation) {
  //             this._messageService.info('You have successfully registered. Waiting for activation!');
  //             return;
  //           }

  //           this.login(
  //             result.accessToken,
  //             result.encryptedAccessToken,
  //             result.expireInSeconds,
  //             result.refreshToken,
  //             result.refreshTokenExpireInSeconds,
  //             false,
  //             '',
  //             result.returnUrl,
  //           );
  //         });
  //     });
  //   });
  // }

  public wsFederationLoginStatusChangeCallback(errorDesc, token, error, tokenType) {
    const user = this.wsFederationAuthenticationContext.getCachedUser();

    const model = new ExternalAuthenticateModel();
    model.authProvider = ExternalLoginProvider.WSFEDERATION;
    model.providerAccessCode = token;
    model.providerKey = user.profile.sub;
    model.singleSignIn = UrlHelper.getSingleSignIn();
    model.returnUrl = UrlHelper.getReturnUrl();

    this._tokenAuthService.externalAuthenticate(model).subscribe((result: ExternalAuthenticateResultModel) => {
      if (result.waitingForActivation) {
        this._messageService.info('You have successfully registered. Waiting for activation!');
        this._router.navigate(['account/login']);
        return;
      }

      this.login(
        result.accessToken,
        result.encryptedAccessToken,
        result.expireInSeconds,
        result.refreshToken,
        result.refreshTokenExpireInSeconds,
        false,
        '',
        result.returnUrl,
      );
    });
  }

  private processAuthenticateResult(authenticateResult: AuthenticateResultModel, redirectUrl?: string) {
    this.authenticateResult = authenticateResult;

    if (authenticateResult.shouldResetPassword) {
      // Password reset

      // noinspection JSIgnoredPromiseFromCall
      this._router.navigate(['account/reset-password'], {
        queryParams: {
          userId: authenticateResult.userId,
          tenantId: abp.session.tenantId,
          resetCode: authenticateResult.passwordResetCode,
        },
      });

      this.clear();
    } else if (authenticateResult.requiresTwoFactorVerification) {
      // Two factor authentication

      this._router.navigate(['account/send-code']);
    } else if (authenticateResult.accessToken) {
      // Successfully logged in

      if (authenticateResult.returnUrl && !redirectUrl) {
        redirectUrl = authenticateResult.returnUrl;
      }

      this.login(
        authenticateResult.accessToken,
        authenticateResult.encryptedAccessToken,
        authenticateResult.expireInSeconds,
        authenticateResult.refreshToken,
        authenticateResult.refreshTokenExpireInSeconds,
        this.rememberMe,
        authenticateResult.twoFactorRememberClientToken,
        redirectUrl,
      );
    } else {
      // Unexpected result!

      this._logService.warn('Unexpected authenticateResult!');
      // noinspection JSIgnoredPromiseFromCall
      this._router.navigate(['account/login']);
    }
  }

  private login(
    accessToken: string,
    encryptedAccessToken: string,
    expireInSeconds: number,
    refreshToken: string,
    refreshTokenExpireInSeconds: number,
    rememberMe?: boolean,
    twoFactorRememberClientToken?: string,
    redirectUrl?: string,
  ): void {
    const tokenExpireDate = rememberMe ? new Date(new Date().getTime() + 1000 * expireInSeconds) : undefined;

    this._tokenService.setToken(accessToken, tokenExpireDate);

    if (refreshToken && rememberMe) {
      const refreshTokenExpireDate = rememberMe ? new Date(new Date().getTime() + 1000 * refreshTokenExpireInSeconds) : undefined;
      this._tokenService.setRefreshToken(refreshToken, refreshTokenExpireDate);
    }

    this._utilsService.setCookieValue(AppConsts.authorization.encryptedAuthTokenName, encryptedAccessToken, tokenExpireDate, abp.appPath);

    if (twoFactorRememberClientToken) {
      this._utilsService.setCookieValue(
        LoginService.twoFactorRememberClientTokenName,
        twoFactorRememberClientToken,
        new Date(new Date().getTime() + 365 * 86400000), // 1 year
        abp.appPath,
      );
    }

    if (redirectUrl) {
      location.href = redirectUrl;
    } else {
      let initialUrl = UrlHelper.initialUrl;

      if (initialUrl.indexOf('/account') > 0) {
        initialUrl = AppConsts.appBaseUrl;
      }

      location.href = initialUrl;
    }
  }

  private clear(): void {
    this.authenticateModel = new AuthenticateModel();
    this.authenticateModel.rememberClient = false;
    this.authenticateResult = null;
    this.rememberMe = false;
  }

  private initExternalLoginProviders(callback?: any) {
    this._tokenAuthService.getExternalAuthenticationProviders().subscribe((providers: ExternalLoginProviderInfoModel[]) => {
      this.externalLoginProviders = _.map(providers, (p) => new ExternalLoginProvider(p));

      if (callback) {
        callback();
      }
    });
  }

  private getWsFederationConnectConfig(loginProvider: ExternalLoginProvider): any {
    const config = {
      clientId: loginProvider.clientId,
      popUp: true,
      callback: this.wsFederationLoginStatusChangeCallback.bind(this),
    } as any;

    if (loginProvider.additionalParams.Tenant) {
      config.tenant = loginProvider.additionalParams.Tenant;
    }

    return config;
  }

  private facebookLoginStatusChangeCallback(resp) {
    if (resp.status === 'connected') {
      const model = new ExternalAuthenticateModel();
      model.authProvider = ExternalLoginProvider.FACEBOOK;
      model.providerAccessCode = resp.authResponse.accessToken;
      model.providerKey = resp.authResponse.userID;
      model.singleSignIn = UrlHelper.getSingleSignIn();
      model.returnUrl = UrlHelper.getReturnUrl();

      this._tokenAuthService.externalAuthenticate(model).subscribe((result: ExternalAuthenticateResultModel) => {
        if (result.waitingForActivation) {
          this._messageService.info('You have successfully registered. Waiting for activation!');
          return;
        }

        this.login(
          result.accessToken,
          result.encryptedAccessToken,
          result.expireInSeconds,
          result.refreshToken,
          result.refreshTokenExpireInSeconds,
          false,
          '',
          result.returnUrl,
        );
      });
    }
  }

  private googleLoginStatusChangeCallback(isSignedIn) {
    if (isSignedIn) {
      const model = new ExternalAuthenticateModel();
      model.authProvider = ExternalLoginProvider.GOOGLE;
      model.providerAccessCode = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
      model.providerKey = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getId();
      model.singleSignIn = UrlHelper.getSingleSignIn();
      model.returnUrl = UrlHelper.getReturnUrl();

      this._tokenAuthService.externalAuthenticate(model).subscribe((result: ExternalAuthenticateResultModel) => {
        if (result.waitingForActivation) {
          this._messageService.info('You have successfully registered. Waiting for activation!');
          return;
        }

        this.login(
          result.accessToken,
          result.encryptedAccessToken,
          result.expireInSeconds,
          result.refreshToken,
          result.refreshTokenExpireInSeconds,
          false,
          '',
          result.returnUrl,
        );
      });
    }
  }

  /**
   * Microsoft login is not completed yet, because of an error thrown by zone.js: https://github.com/angular/zone.js/issues/290
   */
  private microsoftLogin() {
    this._logService.debug(WL.getSession());
    const model = new ExternalAuthenticateModel();
    model.authProvider = ExternalLoginProvider.MICROSOFT;
    model.providerAccessCode = WL.getSession().access_token;
    model.providerKey = WL.getSession().id; // How to get id?
    model.singleSignIn = UrlHelper.getSingleSignIn();
    model.returnUrl = UrlHelper.getReturnUrl();

    this._tokenAuthService.externalAuthenticate(model).subscribe((result: ExternalAuthenticateResultModel) => {
      if (result.waitingForActivation) {
        this._messageService.info('You have successfully registered. Waiting for activation!');
        return;
      }

      this.login(
        result.accessToken,
        result.encryptedAccessToken,
        result.expireInSeconds,
        result.refreshToken,
        result.refreshTokenExpireInSeconds,
        false,
        '',
        result.returnUrl,
      );
    });
  }
}
