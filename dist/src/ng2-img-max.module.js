import { NgModule } from '@angular/core';
import { Ng2ImgMaxService } from './ng2-img-max.service';
import { ImgMaxSizeService } from './img-max-size.service';
import { ImgMaxPXSizeService } from './img-maxpx-size.service';
import { ImgExifService } from './img-exif.service';
import { Ng2PicaModule } from 'ng2-pica';
var Ng2ImgMaxModule = /** @class */ (function () {
    function Ng2ImgMaxModule() {
    }
    Ng2ImgMaxModule.decorators = [
        { type: NgModule, args: [{
                    imports: [
                        Ng2PicaModule
                    ],
                    providers: [
                        { provide: ImgMaxPXSizeService, useClass: ImgMaxPXSizeService },
                        { provide: ImgMaxSizeService, useClass: ImgMaxSizeService },
                        { provide: ImgExifService, useClass: ImgExifService },
                        { provide: Ng2ImgMaxService, useClass: Ng2ImgMaxService }
                    ]
                },] },
    ];
    return Ng2ImgMaxModule;
}());
export { Ng2ImgMaxModule };
//# sourceMappingURL=ng2-img-max.module.js.map