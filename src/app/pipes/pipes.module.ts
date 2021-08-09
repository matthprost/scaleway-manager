import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { IonicModule } from "@ionic/angular";

import { BillingStateIconPipe } from "./billing-state-icon/billing-state-icon.pipe";
import { FileSizePipe } from "./file-size/file-size.pipe";
import { ServerIconPipe } from "./server-icon/server-icon.pipe";
import { TotalVolumesSpacePipe } from "./total-volume-space/total-volumes-space.pipe";
import { ZoneFlagPipe } from "./zone-flag/zone-flag.pipe";

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, FontAwesomeModule],
  declarations: [
    ServerIconPipe,
    BillingStateIconPipe,
    TotalVolumesSpacePipe,
    FileSizePipe,
    ZoneFlagPipe,
  ],
  exports: [
    ServerIconPipe,
    BillingStateIconPipe,
    TotalVolumesSpacePipe,
    FileSizePipe,
    ZoneFlagPipe,
  ],
})
export class PipesModule {}
