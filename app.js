/**
 * 폴더 IN/OUT 설정
 */
const DIST_DIR  = "./images"            // 입력 받을 폴더
const OUT_DIR   = "./output"            // 출력할 폴더

/**
 * require 로 의존성 불러오기
 */
const fs = require('fs')
const moment = require("moment")
const ExifReader = require('exifreader')
const reader = require("readline-sync")

let moveCount = 0

async function workStation() {
    if(!fs.existsSync(DIST_DIR)) {
        throw `${DIST_DIR} 이 존재하지 않습니다.`
    }

    if(fs.existsSync(OUT_DIR)) {        // 출력 폴더가 존재하는지 확인
        try {
            fs.mkdirSync(OUT_DIR + "/photos")
            fs.mkdirSync(OUT_DIR + "/videos")
        } catch(ex) {
            throw `${OUT_DIR} 이 비어있지 않습니다.`
        }
    } else {
        throw `${OUT_DIR} 이 존재하지 않습니다.`
    }

    const fileListOfDist = fs.readdirSync(DIST_DIR)

    for(distFile of fileListOfDist) {
        const distFileLocation = DIST_DIR + "/" + distFile
        let moveToLocation = OUT_DIR    // 최종 저장 디렉토리
        let isLocationDecided = false   // 저장 디렉토리가 지정되었는가?

        
        {   // 파일 형식에 따라서 video / photo 를 구분
            const extension = distFile.split(".")[1].toLowerCase()
            if(extension == "mp4" || extension == "avi" || extension == "mkv" || extension == "wmv" || extension == "mov" || extension == "flv" || extension == "3gp") {
                moveToLocation += "/videos"
            }
        
            if(extension == "bmp" || extension == "jpeg" || extension == "jpg" || extension == "gif" || extension == "png" || extension == "psd") {
                moveToLocation += "/photos"
            }
        }

        {   // EXIF 데이터를 기반으로 위치 파악
            const tags = await ExifReader.load(distFileLocation)

            if(tags.DateTime && tags.DateTime.value && tags.DateTime.value[0]) {
                // 문자열을 moment 에 맞게 수정
                let dateStr = tags.DateTime.value[0]
                let a = dateStr.split(" ")[0].replace(/:/gi,"-")

                const picDate = moment(`${a}T${dateStr.split(" ")[1]}`)

                if(picDate.isValid()) {
                    isLocationDecided = true
                    moveToLocation += `/${picDate.format("YYYY. MM")}`
                }
            } else {
                console.log(`[!] ${distFile}의 파일의 날짜 정보를 찾을 수 없습니다.`)

                const picDate = await new Promise((resolve, reject) => {
                    while(true) {
                        const line = reader.question("[?] Please insert date (YYYYMMDD) or Enter when you unknown.:  ", )

                        if(line === "") {
                            const stat = fs.statSync(distFileLocation)
                            resolve(moment(stat.mtime))
                        } else {
                            const m = moment(line)
                            if(m.isValid()) {
                                resolve(m)
                            } else {
                                continue
                            }
                        }

                        break
                    }
                    
                })
                moveToLocation += `/${picDate.format("YYYY. MM")}`
            }
        }

        {
            // 필요한 경우, 폴더를 만든다.
            if(!fs.existsSync(moveToLocation)) {
                fs.mkdirSync(moveToLocation, { recursive: true })
            }

            // 경로를 붙여서 파일을 이동시킨다.
            moveToLocation += `/${distFile}`

            fs.renameSync(distFileLocation, moveToLocation)
            console.log(`[i] ${distFileLocation} --> ${moveToLocation}`)
            ++moveCount
        }
    }
}

workStation().then(() => {
    console.log(`[i] 정리 완료 총 ${moveCount}개 정리 함.`)
}).catch(ex => {
    console.log("[!] 폴더 정리에 실패했습니다.")
    console.log("이유: ", ex)
})