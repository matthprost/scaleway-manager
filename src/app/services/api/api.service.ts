import { CapacitorHttp, Capacitor } from '@capacitor/core';
import { Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavController, Platform, ToastController } from "@ionic/angular";
import { Storage } from "@ionic/storage";

enum HttpMethods {
  GET,
  POST,
  DELETE,
  PATCH,
}

@Injectable({
  providedIn: "root",
})
export class ApiService {
  // Those routes are for proxy
  // GENERAL API
  private api = "/api";

  private createToastError = async (error) => {
    const toast = await this.toastCtrl.create({
      message: `Error: ${error.error.message || "Unknown Error"}`,
      duration: 5000,
      position: "top",
      mode: "ios",
      color: "danger",
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
    if (Capacitor.isNativePlatform()) {
      // GENERAL API
      this.api = "https://api.scaleway.com";
    }
  }

  private async request<T>(
    method: HttpMethods,
    url: string,
    data: Record<string, any> = {}
  ): Promise<T> {
    const token = await this.storage.get("jwt");
    console.log(`Is native platform: ${Capacitor.isNativePlatform()}`)

    if (Capacitor.isNativePlatform()) {
     // Use CapacitorHttp for native platforms
      try {
        const options = {
          method: HttpMethods[method],
          url,
          "Content-Type": "application/json",
          ...(token ? { "X-Session-Token": token.token } : {}),
          data,
        };

        console.log(`>>> Trying to make a request to: ${url} with method: ${HttpMethods[method.toString()]}. Detailed options: ${JSON.stringify(options)}`)

        let result: T;
        if (method === HttpMethods.GET) {
          result = await CapacitorHttp.get(options) as T;
        } else if (method === HttpMethods.POST) {
          result = await CapacitorHttp.post(options) as T;
        } else if (method === HttpMethods.PATCH) {
          result = await CapacitorHttp.patch(options) as T;
        } else if (method === HttpMethods.DELETE) {
          result = await CapacitorHttp.delete(options) as T;
        } else {
          throw new Error("Unsupported HTTP method");
        }

        console.log(result)

        return result;
      } catch (error) {
        console.log(error)
        return await this.handleRequestError(error, method, url, data);
      }
    } else {
      // Use Angular HttpClient for web
      try {
        switch (method) {
          case HttpMethods.GET:
            return await this.httpClient.get<T>(url, { headers:
              token && token.token
                ? {
                    "X-Session-Token": token.token,
                  }
                : {}, }).toPromise();
          case HttpMethods.POST:
            return await this.httpClient.post<T>(url, data, { headers:
              token && token.token
                ? {
                    "X-Session-Token": token.token,
                  }
                : {}, }).toPromise();
          case HttpMethods.PATCH:
            return await this.httpClient.patch<T>(url, data, { headers:
              token && token.token
                ? {
                    "X-Session-Token": token.token,
                  }
                : {}, }).toPromise();
          case HttpMethods.DELETE:
            return await this.httpClient.delete<T>(url, { headers:
              token && token.token
                ? {
                    "X-Session-Token": token.token,
                  }
                : {}, }).toPromise();
          default:
            throw new Error("Unsupported HTTP method");
        }
      } catch (error) {
        return await this.handleRequestError(error, method, url, data);
      }
    }
  }

  private async handleRequestError<T>(error: any, method: HttpMethods, url: string, data: Record<string, any>) {
    console.log(error, method, url, data);

    const token = await this.storage.get("jwt");

    if (
      error &&
      error.status &&
      error.status === 401 &&
      (error.error.type === "invalid_auth" ||
        error.error.type === "denied_authentication") &&
      token
    ) {
      console.log(
        "ERROR 401: Token is not valid anymore, trying to renew it..."
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
    } else if (error.status === 400 && error.error.details[0].argument_name === "2FA_token") {
      throw error;
    } else {
      await this.createToastError(error);
      throw error;
    }
  }

  private async renewJWT(): Promise<any> {
    try {
      const token = await this.storage.get("jwt");
      console.log("Token in storage before renew:", token);

      if (Capacitor.isNativePlatform()) {
        // Use CapacitorHttp for native platforms
        const result = await CapacitorHttp.post({
          url: this.getIAMApiUrl() + "/jwts/" + token.jwt.jti + "/renew",
          data: { renew_token: token.renew_token },
        });

        await this.storage.set("jwt", result);
        console.log("JWT RENEWED!");

        return result;
      } else {
        // Use Angular HttpClient for web
        const result = await this.httpClient.post<any>(
          this.getIAMApiUrl() + "/jwts/" + token.jwt.jti + "/renew",
          { renew_token: token.renew_token }
        ).toPromise();

        await this.storage.set("jwt", result);
        console.log("JWT RENEWED!");

        return result;
      }
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

  public delete<T>(url: string): Promise<T> {
    return this.request<T>(HttpMethods.DELETE, url);
  }
}
