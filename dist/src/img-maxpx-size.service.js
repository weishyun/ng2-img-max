import { Injectable, Inject, forwardRef } from '@angular/core';
import { Subject } from 'rxjs';
import { Ng2PicaService } from 'ng2-pica';
import { ImgExifService } from './img-exif.service';
var ImgMaxPXSizeService = /** @class */ (function () {
    function ImgMaxPXSizeService(ng2PicaService, imageExifService) {
        this.ng2PicaService = ng2PicaService;
        this.imageExifService = imageExifService;
    }
    ImgMaxPXSizeService.prototype.resizeImage = function (file, maxWidth, maxHeight, logExecutionTime) {
        var _this = this;
        if (logExecutionTime === void 0) { logExecutionTime = false; }
        var resizedFileSubject = new Subject();
        this.timeAtStart = new Date().getTime();
        if (file.type !== "image/jpeg" && file.type !== "image/png") {
            //END OF RESIZE
            setTimeout(function () {
                resizedFileSubject.error({ resizedFile: file, reason: "The provided File is neither of type jpg nor of type png.", error: "INVALID_EXTENSION" });
            }, 0);
            return resizedFileSubject.asObservable();
        }
        var img = new Image();
        var self = this;
        img.onload = function () {
            _this.imageExifService.getOrientedImage(img).then(function (orientedImg) {
                window.URL.revokeObjectURL(img.src);
                var currentWidth = orientedImg.width;
                var currentHeight = orientedImg.height;
                var newWidth = currentWidth;
                var newHeight = currentHeight;
                if (newWidth > maxWidth) {
                    newWidth = maxWidth;
                    //resize height proportionally
                    var ratio = maxWidth / currentWidth; //is gonna be <1
                    newHeight = newHeight * ratio;
                }
                currentHeight = newHeight;
                if (newHeight > maxHeight) {
                    newHeight = maxHeight;
                    //resize width proportionally
                    var ratio = maxHeight / currentHeight; //is gonna be <1
                    newWidth = newWidth * ratio;
                }
                if (newHeight === orientedImg.height && newWidth === orientedImg.width) {
                    //no resizing necessary
                    resizedFileSubject.next(file);
                    self.logExecutionTime(logExecutionTime);
                }
                else {
                    self.ng2PicaService.resize([file], newWidth, newHeight).subscribe(function (result) {
                        //all good, result is a file
                        resizedFileSubject.next(result);
                        self.logExecutionTime(logExecutionTime);
                    }, function (error) {
                        //something went wrong 
                        resizedFileSubject.error({ resizedFile: file, reason: error, error: "PICA_ERROR" });
                        self.logExecutionTime(logExecutionTime);
                    });
                }
            });
        };
        img.src = window.URL.createObjectURL(file);
        return resizedFileSubject.asObservable();
    };
    ;
    ImgMaxPXSizeService.prototype.logExecutionTime = function (logExecutionTime) {
        if (logExecutionTime) {
            console.info("Execution time: ", new Date().getTime() - this.timeAtStart + "ms");
        }
    };
    ImgMaxPXSizeService.decorators = [
        { type: Injectable },
    ];
    /** @nocollapse */
    ImgMaxPXSizeService.ctorParameters = function () { return [
        { type: Ng2PicaService, decorators: [{ type: Inject, args: [forwardRef(function () { return Ng2PicaService; }),] }] },
        { type: ImgExifService, decorators: [{ type: Inject, args: [forwardRef(function () { return ImgExifService; }),] }] }
    ]; };
    return ImgMaxPXSizeService;
}());
export { ImgMaxPXSizeService };
//# sourceMappingURL=img-maxpx-size.service.js.map