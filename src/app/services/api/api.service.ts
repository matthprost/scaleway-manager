import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { NavController, Platform, ToastController } from "@ionic/angular";
import { Storage } from "@ionic/storage";

enum HttpMethods {
  GET,
  POST,
  DELETE,
  PATCH,
  OPTIONS,
}

@Injectable({
  providedIn: "root",
})
export class ApiService {
  // Those routes are for proxy
  // GENERAL API
  private readonly api: string = "/api";

  // BILLING API
  private readonly billing: string = "/api/billing/v1";

  private createToastError = async (error) => {
    const toast = await this.toastCtrl.create({
      message: `Error: ${error.error.message || "Unknown Error"}`,
      duration: 5000,
      position: "top",
      mode: "ios",
      color: "danger",
      //showCloseButton: true,
    });

    await toast.present();
  }

  constructor(
    private storage: Storage,
    private httpClient: HttpClient,
    private navCtrl: NavController,
    private platform: Platform,
    private toastCtrl: ToastController
  ) {
    // If we are running on Android / iOS then lets use real routes
    if (this.platform.is("cordova") === true) {
      // GENERAL API
      this.api = "https://api.scaleway.com";

      // BILLING API
      this.billing = "https://billing.scaleway.com";
    }
  }

  private async request<T>(
    method: HttpMethods,
    url: string,
    data: Record<string, any> = {}
  ): Promise<T> {
    const token = await this.storage.get("jwt");

    // This is for login when token doesn't exist
    if (!token) {
      return await this.httpClient.request<T>(HttpMethods[method.toString()], url, {
        headers: token
          ? {
            "X-Session-Token": token.token,
          }
          : {},
        body: data,
      }).toPromise();
    }

    try {
      return await this.httpClient.request<T>(HttpMethods[method.toString()], url, {
          headers:
            token && token.token
              ? {
                  "X-Session-Token": token.token,
                }
              : {},
          body: data,
        }).toPromise();
    } catch (error) {
      console.log(error);

      if (
        error &&
        error.status &&
        error.status === 401 &&
        (error.error.type === "invalid_auth" ||
          error.error.type === "denied_authentication") &&
        token
      ) {
        console.log(
          "ERROR 401: Token is be not valid anymore, trying to renew it..."
        );

        try {
          await this.renewJWT();

          return this.request<T>(method, url, data);
        } catch (e) {
          console.log("DELETE JWT IN STORAGE");
          await this.storage.remove("jwt");
          await this.navCtrl.navigateRoot(["/login"]);
          throw e;
        }
      } else {
        await this.createToastError(error);
        throw error;
      }
    }
  }

  private async renewJWT(): Promise<any> {
    try {
      const token = await this.storage.get("jwt");
      console.log("Token in storage before renew:", token);

      const result = await this.httpClient.request<any>(
          "POST",
          this.getIAMApiUrl() + "/jwts/" + token.jwt.jti + "/renew",
          {
            body: { renew_token: token.renew_token },
          }).toPromise();

      await this.storage.set("jwt", result);
      console.log("JWT RENEWED!");

      return result;
    } catch (e) {
      console.log("Error while trying to renew token:", e);
      throw e;
    }
  }

  public getAccountApiUrlV1(): string {
    return this.api + "/account/v1";
  }

  public getAccountApiUrlV2(): string {
    return this.api + "/account/v2";
  }

  public getIAMApiUrl(): string {
    return this.api + "/iam/v1alpha1";
  }

  public getInstanceUrl(): string {
    return this.api + "/instance/v1/zones/";
  }

  public getBmaasUrl(): string {
    return this.api + "/baremetal/v1/zones/";
  }

  public getBillingApiUrl(): string {
    return this.billing;
  }

  public getApiUrl(): string {
    return this.api;
  }

  public get<T>(url: string): Promise<T> {
    return this.request<T>(HttpMethods.GET, url);
  }

  public post<T>(url: string, data?: Record<string, any>): Promise<T> {
    return this.request<T>(HttpMethods.POST, url, data);
  }

  public patch<T>(url: string, data?: Record<string, any>): Promise<T> {
    return this.request<T>(HttpMethods.PATCH, url, data);
  }

  public options<T>(url: string, data?: Record<string, any>): Promise<T> {
    return this.request<T>(HttpMethods.OPTIONS, url, data);
  }

  public delete<T>(url: string): Promise<T> {
    return this.request<T>(HttpMethods.DELETE, url);
  }
}
