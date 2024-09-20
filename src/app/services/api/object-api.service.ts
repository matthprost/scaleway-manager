import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Platform, ToastController } from "@ionic/angular";
import { Storage } from "@ionic/storage-angular";
// import * as aws4 from "aws4";
import * as xml2js from "xml2js";

import { AuthService } from "../user/auth/auth.service";
import { ProjectService } from "../user/project/project.service";
import { TokensService } from "../user/project/tokens/tokens.service";

enum HttpMethods {
  GET,
  POST,
  DELETE,
  PATCH,
  OPTIONS,
  PUT,
}

@Injectable({
  providedIn: "root",
})
export class ObjectApiService {
  constructor(
    private httpClient: HttpClient,
    private storage: Storage,
    private authService: AuthService,
    private toastController: ToastController,
    private platform: Platform,
    private tokensService: TokensService,
    private projectService: ProjectService
  ) {}

  private async renewToken() {
    console.warn("RENEWING TOKEN FOR S3");
    const newToken = await this.tokensService.addToken();
    const currentProjectId = await this.projectService.getCurrentProjectId();
    const oldStorage = await this.storage.get("apiTokenByProject");
    await this.storage.set("apiTokenByProject", {
      ...oldStorage,
      [currentProjectId]: newToken,
    });

    return newToken;
  }

  public async request(
    method: HttpMethods,
    area: string,
    subHost?: string,
    path?: string,
    customHeader?: {}
  ) {
    const opts = {
      service: "s3",
      region: area,
      host: subHost
        ? subHost + ".s3." + area + ".scw.cloud"
        : "s3." + area + ".scw.cloud",
      path,
      headers: customHeader ? customHeader : {},
      method: HttpMethods[method.toString()],
    };


    // We get token in storage
    const currentProject = await this.projectService.getCurrentProjectId();
    const apiTokenStorage = await this.storage.get("apiTokenByProject");

    let apiToken = apiTokenStorage && apiTokenStorage[currentProject];
    // If aws token doesn't exist we create new and store it
    if (!apiToken) {
      apiToken = await this.renewToken();
    }


    console.log("AWS-TOKEN", apiToken);

    try {
      // Create AWS Signature
      // aws4.sign(opts, {
      //   accessKeyId: apiToken.access_key,
      //   secretAccessKey: apiToken.secret_key,
      // });
      console.log("AWS-OPTIONS", opts);

      let myHeaders = { ...opts.headers, ...{ subHost }, ...customHeader };
      let url;

      if (this.platform.is("cordova")) {
        url =
          "https://" +
          (subHost ? subHost + "." : "") +
          "s3." +
          area +
          ".scw.cloud" +
          (path ? path : "");
      } else {
        if (path) {
          myHeaders = {
            ...opts.headers,
            ...{ subHost },
            ...{ path },
            ...customHeader,
            ...{ zone: area },
          };
        }
        url = "/s3";
      }

      const value = await this.httpClient
        .request(HttpMethods[method.toString()], url, {
          body: null,
          headers: subHost
            ? myHeaders
            : { ...opts.headers, ...customHeader, ...{ zone: area } },
          responseType: "text",
        })
        .toPromise();

      // Convert XML into JSON
      if (value && value.indexOf("xml") > 0) {
        return await xml2js.parseStringPromise(value);
      } else {
        return "ok";
      }
    } catch (e) {
      console.log("AN ERROR OCCURRED:", e);

      let errorMessage = null;
      if (e.error.indexOf("<?xml") === 0) {
        errorMessage = await xml2js.parseStringPromise(e.error);
        console.log(errorMessage.Error.Message[0]);
      }

      await this.storage.remove("apiToken");

      if (
        e.status === 403 &&
        (e.statusText === "Forbidden" || e.statusText === "Unknown Error")
      ) {
        await this.renewToken();
        return this.request(method, area, subHost, path, customHeader);
      }

      const toast = await this.toastController.create({
        position: "top",
        //showCloseButton: true,
        duration: 8000,
        color: "danger",
        mode: "ios",
        message: errorMessage
          ? errorMessage.Error.Message[0]
          : "An error occurred",
      });

      await toast.present();

      throw e;
    }
  }

  public get(
    area: string,
    subHost?: string,
    path?: string,
    customHeader?: {}
  ) {
    return this.request(HttpMethods.GET, area, subHost, path, customHeader);
  }

  public post(
    area: string,
    subHost?: string,
    path?: string,
    customHeader?: {}
  ) {
    return this.request(HttpMethods.POST, area, subHost, path, customHeader);
  }

  public put(
    area: string,
    subHost?: string,
    path?: string,
    customHeader?: {}
  ) {
    return this.request(HttpMethods.PUT, area, subHost, path, customHeader);
  }

  public patch(
    area: string,
    subHost?: string,
    path?: string,
    customHeader?: {}
  ) {
    return this.request(
      HttpMethods.PATCH,
      area,
      subHost,
      path,
      customHeader
    );
  }

  public options(
    area: string,
    subHost?: string,
    path?: string,
    customHeader?: {}
  ) {
    return this.request(
      HttpMethods.OPTIONS,
      area,
      subHost,
      path,
      customHeader
    );
  }

  public delete(
    area: string,
    subHost?: string,
    path?: string,
    customHeader?: {}
  ) {
    return this.request(
      HttpMethods.DELETE,
      area,
      subHost,
      path,
      customHeader
    );
  }
}
