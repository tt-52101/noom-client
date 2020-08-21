import { Injectable } from "@angular/core";
import { EditionPaymentType, EditionSelectDto, PaymentPeriodType, SubscriptionPaymentGatewayType } from "@shared/service-proxies/service-proxies";

@Injectable()
export class PaymentHelperService {
  getPaymentGatewayType(gatewayType) {
    if (parseInt(gatewayType, 10) === SubscriptionPaymentGatewayType.Paypal) {
      return "Paypal";
    }

    return "Stripe";
  }

  getEditionPaymentType(editionPaymentType) {
    if (parseInt(editionPaymentType, 10) === EditionPaymentType.BuyNow) {
      return "BuyNow";
    } else if (parseInt(editionPaymentType, 10) === EditionPaymentType.Extend) {
      return "Extend";
    } else if (parseInt(editionPaymentType, 10) === EditionPaymentType.NewRegistration) {
      return "NewRegistration";
    }

    return "Upgrade";
  }

  getInitialSelectedPaymentPeriodType(edition: EditionSelectDto) {
    if (edition.dailyPrice > 0) {
      return PaymentPeriodType.Daily;
    } else if (edition.weeklyPrice > 0) {
      return PaymentPeriodType.Weekly;
    } else if (edition.monthlyPrice > 0) {
      return PaymentPeriodType.Monthly;
    } else if (edition.annualPrice > 0) {
      return PaymentPeriodType.Annual;
    }

    return undefined;
  }
}
