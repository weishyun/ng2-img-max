(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('rxjs'), require('exif-js/exif'), require('ng2-pica')) :
	typeof define === 'function' && define.amd ? define(['exports', '@angular/core', 'rxjs', 'exif-js/exif', 'ng2-pica'], factory) :
	(factory((global['ng2-img-max'] = global['ng2-img-max'] || {}),global.ng.core,global.Rx,null,global.ng2Pica));
}(this, (function (exports,_angular_core,rxjs,exifJs_exif,ng2Pica) { 'use strict';

var ImgExifService = /** @class */ (function () {
    function ImgExifService() {
    }
    ImgExifService.prototype.getOrientedImage = function (image) {
        var result = new Promise(function (resolve, reject) {
            var img;
            if (!EXIF) {
                EXIF = {};
                EXIF.getData = function (img, callback) {
                    callback.call(image);
                    return true;
                };
                EXIF.getTag = function () { return false; };
            }
            EXIF.getData(image, function () {
                var orientation = EXIF.getTag(image, "Orientation");
                if (orientation != 1) {
                    var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d"), cw = image.width, ch = image.height, cx = 0, cy = 0, deg = 0;
                    switch (orientation) {
                        case 3:
                        case 4:
                            cx = -image.width;
                            cy = -image.height;
                            deg = 180;
                            break;
                        case 5:
                        case 6:
                            cw = image.height;
                            ch = image.width;
                            cy = -image.height;
                            deg = 90;
                            break;
                        case 7:
                        case 8:
                            cw = image.height;
                            ch = image.width;
                            cx = -image.width;
                            deg = 270;
                            break;
                        default:
                            break;
                    }
                    canvas.width = cw;
                    canvas.height = ch;
                    if ([2, 4, 5, 7].indexOf(orientation) > -1) {
                        //flip image
                        ctx.translate(cw, 0);
                        ctx.scale(-1, 1);
                    }
                    ctx.rotate(deg * Math.PI / 180);
                    ctx.drawImage(image, cx, cy);
                    img = document.createElement("img");
                    img.width = cw;
                    img.height = ch;
                    img.addEventListener('load', function () {
                        resolve(img);
                    });
                    img.src = canvas.toDataURL("image/png");
                }
                else {
                    resolve(image);
                }
            });
        });
        return result;
    };
    ImgExifService.decorators = [
        { type: _angular_core.Injectable },
    ];
    return ImgExifService;
}());

var MAX_STEPS = 15;
var ImgMaxSizeService = /** @class */ (function () {
    function ImgMaxSizeService(imageExifService) {
        this.imageExifService = imageExifService;
    }
    ImgMaxSizeService.prototype.compressImage = function (file, maxSizeInMB, ignoreAlpha, logExecutionTime) {
        var _this = this;
        if (ignoreAlpha === void 0) { ignoreAlpha = false; }
        if (logExecutionTime === void 0) { logExecutionTime = false; }
        var compressedFileSubject = new rxjs.Subject();
        this.timeAtStart = new Date().getTime();
        this.initialFile = file;
        if (file.type !== "image/jpeg" && file.type !== "image/png") {
            //END OF COMPRESSION
            setTimeout(function () {
                compressedFileSubject.error({ compressedFile: file, reason: "File provided is neither of type jpg nor of type png.", error: "INVALID_EXTENSION" });
            }, 0);
            return compressedFileSubject.asObservable();
        }
        var oldFileSize = file.size / 1024 / 1024;
        if (oldFileSize < maxSizeInMB) {
            // END OF COMPRESSION
            // FILE SIZE ALREADY BELOW MAX_SIZE -> no compression needed
            setTimeout(function () { compressedFileSubject.next(file); }, 0);
            return compressedFileSubject.asObservable();
        }
        var cvs = document.createElement('canvas');
        var ctx = cvs.getContext('2d');
        var img = new Image();
        var self = this;
        img.onload = function () {
            _this.imageExifService.getOrientedImage(img).then(function (orientedImg) {
                window.URL.revokeObjectURL(img.src);
                cvs.width = orientedImg.width;
                cvs.height = orientedImg.height;
                ctx.drawImage(orientedImg, 0, 0);
                var imageData = ctx.getImageData(0, 0, orientedImg.width, orientedImg.height);
                if (file.type === "image/png" && _this.isImgUsingAlpha(imageData) && !ignoreAlpha) {
                    //png image with alpha
                    compressedFileSubject.error({ compressedFile: file, reason: "File provided is a png image which uses the alpha channel. No compression possible.", error: "PNG_WITH_ALPHA" });
                }
                ctx = cvs.getContext('2d', { 'alpha': false });
                ctx.drawImage(orientedImg, 0, 0);
                self.getCompressedFile(cvs, 50, maxSizeInMB, 1).then(function (compressedFile) {
                    compressedFileSubject.next(compressedFile);
                    self.logExecutionTime(logExecutionTime);
                }).catch(function (error) {
                    compressedFileSubject.error(error);
                    self.logExecutionTime(logExecutionTime);
                });
            });
        };
        img.src = window.URL.createObjectURL(file);
        return compressedFileSubject.asObservable();
    };
    
    ImgMaxSizeService.prototype.getCompressedFile = function (cvs, quality, maxSizeInMB, currentStep) {
        var _this = this;
        var result = new Promise(function (resolve, reject) {
            cvs.toBlob(function (blob) {
                if (currentStep + 1 > MAX_STEPS) {
                    //COMPRESSION END
                    //maximal steps reached
                    reject({ compressedFile: _this.getResultFile(blob), reason: "Could not find the correct compression quality in " + MAX_STEPS + " steps.", error: "MAX_STEPS_EXCEEDED" });
                }
                else {
                    var newQuality = _this.getCalculatedQuality(blob, quality, maxSizeInMB, currentStep);
                    _this.checkCompressionStatus(cvs, blob, quality, maxSizeInMB, currentStep, newQuality)
                        .then(function (result) {
                        resolve(result);
                    })
                        .catch(function (result) {
                        reject(result);
                    });
                }
            }, "image/jpeg", quality / 100);
        });
        return result;
    };
    ImgMaxSizeService.prototype.getResultFile = function (blob) {
        return this.generateResultFile(blob, this.initialFile.name, this.initialFile.type, new Date().getTime());
    };
    ImgMaxSizeService.prototype.generateResultFile = function (blob, name, type, lastModified) {
        var resultFile = new Blob([blob], { type: type });
        return this.blobToFile(resultFile, name, lastModified);
    };
    ImgMaxSizeService.prototype.blobToFile = function (blob, name, lastModified) {
        var file = blob;
        file.name = name;
        file.lastModified = lastModified;
        //Cast to a File() type
        return file;
    };
    ImgMaxSizeService.prototype.getCalculatedQuality = function (blob, quality, maxSizeInMB, currentStep) {
        //CALCULATE NEW QUALITY
        var currentSize = blob.size / 1024 / 1024;
        var ratioMaxSizeToCurrentSize = maxSizeInMB / currentSize;
        if (ratioMaxSizeToCurrentSize > 5) {
            //max ratio to avoid extreme quality values
            ratioMaxSizeToCurrentSize = 5;
        }
        var ratioMaxSizeToInitialSize = currentSize / (this.initialFile.size / 1024 / 1024);
        if (ratioMaxSizeToInitialSize < 0.05) {
            //min ratio to avoid extreme quality values
            ratioMaxSizeToInitialSize = 0.05;
        }
        var newQuality = 0;
        var multiplicator = Math.abs(ratioMaxSizeToInitialSize - 1) * 10 / (currentStep * 1.7) / ratioMaxSizeToCurrentSize;
        if (multiplicator < 1) {
            multiplicator = 1;
        }
        if (ratioMaxSizeToCurrentSize >= 1) {
            newQuality = quality + (ratioMaxSizeToCurrentSize - 1) * 10 * multiplicator;
        }
        else {
            newQuality = quality - (1 - ratioMaxSizeToCurrentSize) * 10 * multiplicator;
        }
        if (newQuality > 100) {
            //max quality = 100, so let's set the new quality to the value in between the old quality and 100 in case of > 100
            newQuality = quality + (100 - quality) / 2;
        }
        if (newQuality < 0) {
            //min quality = 0, so let's set the new quality to the value in between the old quality and 0 in case of < 0
            newQuality = quality - quality / 2;
        }
        return newQuality;
    };
    ImgMaxSizeService.prototype.checkCompressionStatus = function (cvs, blob, quality, maxSizeInMB, currentStep, newQuality) {
        var _this = this;
        var result = new Promise(function (resolve, reject) {
            if (quality === 100 && newQuality >= 100) {
                //COMPRESSION END
                //Seems like quality 100 is max but file still too small, case that shouldn't exist as the compression shouldn't even have started in the first place
                reject({ compressedFile: _this.initialFile, reason: "Unfortunately there was an error while compressing the file.", error: "FILE_BIGGER_THAN_INITIAL_FILE" });
            }
            else if ((quality < 1) && (newQuality < quality)) {
                //COMPRESSION END
                //File size still too big but can't compress further than quality=0
                reject({ compressedFile: _this.getResultFile(blob), reason: "Could not compress image enough to fit the maximal file size limit.", error: "UNABLE_TO_COMPRESS_ENOUGH" });
            }
            else if ((newQuality > quality) && (Math.round(quality) == Math.round(newQuality))) {
                //COMPRESSION END
                //next steps quality would be the same quality but newQuality is slightly bigger than old one, means we most likely found the nearest quality to compress to maximal size
                resolve(_this.getResultFile(blob));
            }
            else if (currentStep > 5 && (newQuality > quality) && (newQuality < quality + 2)) {
                //COMPRESSION END
                //for some rare occasions the algorithm might be stuck around e.g. 98.5 and 97.4 because of the maxQuality of 100, the current quality is the nearest possible quality in that case
                resolve(_this.getResultFile(blob));
            }
            else if ((newQuality > quality) && Number.isInteger(quality) && (Math.floor(newQuality) == quality)) {
                //COMPRESSION END
                /*
                    in the previous step if ((quality > newQuality) && (Math.round(quality) == Math.round(newQuality))) applied, so
                    newQuality = Math.round(newQuality) - 1; this was done to reduce the quality at least a full integer down to not waste a step
                    with the same compression rate quality as before. Now, the newQuality is still only in between the old quality (e.g. 93)
                    and the newQuality (e.g. 94) which most likely means that the value for the newQuality (the bigger one) would make the filesize
                    too big so we should just stick with the current, lower quality and return that file.
                */
                resolve(_this.getResultFile(blob));
            }
            else {
                //CONTINUE COMPRESSION
                if ((quality > newQuality) && (Math.round(quality) == Math.round(newQuality))) {
                    //quality can only be an integer -> make sure difference between old quality and new one is at least a whole integer number
                    // - it would be nonsense to compress again with the same quality
                    newQuality = Math.round(newQuality) - 1;
                }
                //recursively call function again
                resolve(_this.getCompressedFile(cvs, newQuality, maxSizeInMB, currentStep + 1));
            }
        });
        return result;
    };
    ImgMaxSizeService.prototype.isImgUsingAlpha = function (imageData) {
        for (var i = 0; i < imageData.data.length; i += 4) {
            if (imageData.data[i + 3] !== 255) {
                return true;
            }
        }
        return false;
    };
    ImgMaxSizeService.prototype.logExecutionTime = function (logExecutionTime) {
        if (logExecutionTime) {
            console.info("Execution time: ", new Date().getTime() - this.timeAtStart + "ms");
        }
    };
    ImgMaxSizeService.decorators = [
        { type: _angular_core.Injectable },
    ];
    /** @nocollapse */
    ImgMaxSizeService.ctorParameters = function () { return [
        { type: ImgExifService, decorators: [{ type: _angular_core.Inject, args: [_angular_core.forwardRef(function () { return ImgExifService; }),] }] }
    ]; };
    return ImgMaxSizeService;
}());

var ImgMaxPXSizeService = /** @class */ (function () {
    function ImgMaxPXSizeService(ng2PicaService, imageExifService) {
        this.ng2PicaService = ng2PicaService;
        this.imageExifService = imageExifService;
    }
    ImgMaxPXSizeService.prototype.resizeImage = function (file, maxWidth, maxHeight, logExecutionTime) {
        var _this = this;
        if (logExecutionTime === void 0) { logExecutionTime = false; }
        var resizedFileSubject = new rxjs.Subject();
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
    
    ImgMaxPXSizeService.prototype.logExecutionTime = function (logExecutionTime) {
        if (logExecutionTime) {
            console.info("Execution time: ", new Date().getTime() - this.timeAtStart + "ms");
        }
    };
    ImgMaxPXSizeService.decorators = [
        { type: _angular_core.Injectable },
    ];
    /** @nocollapse */
    ImgMaxPXSizeService.ctorParameters = function () { return [
        { type: ng2Pica.Ng2PicaService, decorators: [{ type: _angular_core.Inject, args: [_angular_core.forwardRef(function () { return ng2Pica.Ng2PicaService; }),] }] },
        { type: ImgExifService, decorators: [{ type: _angular_core.Inject, args: [_angular_core.forwardRef(function () { return ImgExifService; }),] }] }
    ]; };
    return ImgMaxPXSizeService;
}());

var Ng2ImgMaxService = /** @class */ (function () {
    function Ng2ImgMaxService(imgMaxSizeService, imgMaxPXSizeService, imageExifService) {
        this.imgMaxSizeService = imgMaxSizeService;
        this.imgMaxPXSizeService = imgMaxPXSizeService;
        this.imageExifService = imageExifService;
    }
    Ng2ImgMaxService.prototype.compress = function (files, maxSizeInMB, ignoreAlpha, logExecutionTime) {
        var _this = this;
        if (ignoreAlpha === void 0) { ignoreAlpha = false; }
        if (logExecutionTime === void 0) { logExecutionTime = false; }
        var compressedFileSubject = new rxjs.Subject();
        files.forEach(function (file) {
            _this.compressImage(file, maxSizeInMB, ignoreAlpha, logExecutionTime).subscribe(function (value) {
                compressedFileSubject.next(value);
            }, function (error) {
                compressedFileSubject.error(error);
            });
        });
        return compressedFileSubject.asObservable();
    };
    Ng2ImgMaxService.prototype.resize = function (files, maxWidth, maxHeight, logExecutionTime) {
        var _this = this;
        if (logExecutionTime === void 0) { logExecutionTime = false; }
        var resizedFileSubject = new rxjs.Subject();
        files.forEach(function (file) {
            _this.resizeImage(file, maxWidth, maxHeight, logExecutionTime).subscribe(function (value) {
                resizedFileSubject.next(value);
            }, function (error) {
                resizedFileSubject.error(error);
            });
        });
        return resizedFileSubject.asObservable();
    };
    Ng2ImgMaxService.prototype.compressImage = function (file, maxSizeInMB, ignoreAlpha, logExecutionTime) {
        if (ignoreAlpha === void 0) { ignoreAlpha = false; }
        if (logExecutionTime === void 0) { logExecutionTime = false; }
        return this.imgMaxSizeService.compressImage(file, maxSizeInMB, ignoreAlpha, logExecutionTime);
    };
    Ng2ImgMaxService.prototype.resizeImage = function (file, maxWidth, maxHeight, logExecutionTime) {
        if (logExecutionTime === void 0) { logExecutionTime = false; }
        return this.imgMaxPXSizeService.resizeImage(file, maxWidth, maxHeight, logExecutionTime);
    };
    Ng2ImgMaxService.prototype.getEXIFOrientedImage = function (image) {
        return this.imageExifService.getOrientedImage(image);
    };
    Ng2ImgMaxService.decorators = [
        { type: _angular_core.Injectable },
    ];
    /** @nocollapse */
    Ng2ImgMaxService.ctorParameters = function () { return [
        { type: ImgMaxSizeService, decorators: [{ type: _angular_core.Inject, args: [_angular_core.forwardRef(function () { return ImgMaxSizeService; }),] }] },
        { type: ImgMaxPXSizeService, decorators: [{ type: _angular_core.Inject, args: [_angular_core.forwardRef(function () { return ImgMaxPXSizeService; }),] }] },
        { type: ImgExifService, decorators: [{ type: _angular_core.Inject, args: [_angular_core.forwardRef(function () { return ImgExifService; }),] }] }
    ]; };
    return Ng2ImgMaxService;
}());

var Ng2ImgMaxModule = /** @class */ (function () {
    function Ng2ImgMaxModule() {
    }
    Ng2ImgMaxModule.decorators = [
        { type: _angular_core.NgModule, args: [{
                    imports: [
                        ng2Pica.Ng2PicaModule
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

exports.Ng2ImgMaxService = Ng2ImgMaxService;
exports.Ng2ImgMaxModule = Ng2ImgMaxModule;
exports.ImgMaxSizeService = ImgMaxSizeService;
exports.ImgMaxPXSizeService = ImgMaxPXSizeService;
exports.ImgExifService = ImgExifService;

Object.defineProperty(exports, '__esModule', { value: true });

})));
