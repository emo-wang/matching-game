export interface MatchingCell {
    id: number; // 格子id，从0到w*h, 为连续的数字
    type: string; // 用于显示icon
    typeId: number; // 用于匹配
    isMatched: boolean; // 格子是否匹配
    isEmpty: boolean; // 格子是否为空
}

export interface MatchingData {
    mapData: Map<number, MatchingCell>,
    cols: number,
    rows: number,
    totalCount?: number,
    typeCount?: number,
}

/**
 * 洗牌算法（不包括数组中为-1的元素）
 * @param array 
 * @returns 
 */
export function shuffleArray(array: any) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        if (array[i] !== -1 && array[j] !== -1) {
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    return array;
}

const typeMap = [
    {
        mapId: 0,
        rows: 12,
        cols: 20,
        typeCount: 30, // 有多少不同的格子
        totalCount: 240 // 格子总数
    }, {
        mapId: 1,
        rows: 11,
        cols: 19,
        typeCount: 26,
        totalCount: 104
    },
]


export function initMatchingData(typeId: number = 0): MatchingData {
    const { mapId, cols, rows, typeCount, totalCount } = typeMap[typeId] || { mapId: 0, cols: 12, rows: 20, typeCount: 30, totalCount: 160 };
    // 由格子种类组成的一维数组
    let typeArray = []

    if (totalCount % 2 === 1) throw new Error("totalCount must be even")
    if (totalCount % (typeCount * 2) !== 0) throw new Error("totalCount must be divisible by typeCount * 2")

    const mapData = new Map<number, MatchingCell>();

    switch (mapId) {
        case 0:
            // 没有间隙
            for (let i = 0; i < rows * cols / typeCount; i++) {
                for (let j = 0; j < typeCount; j++) {
                    typeArray.push(j);
                }
            }
            shuffleArray(typeArray);
            break;
        case 1:
            // 斜的分布，中间隔两行，这里的0，1，2，3...是id，typeArray的话是代表typeId，需要进行转换
            const arr = [
                [0, -1, -1, 1, 2, -1, -1, 3, 4, -1, -1, 5, 6, -1, -1, 7, 8, -1, -1],
                [-1, -1, 9, 10, -1, -1, 11, 12, -1, -1, 13, 14, -1, -1, 15, 16, -1, -1, 17],
                [-1, 18, 19, -1, -1, 20, 21, -1, -1, 22, 23, -1, -1, 24, 25, -1, -1, 26, 27],
                [28, 29, -1, -1, 30, 31, -1, -1, 32, 33, -1, -1, 34, 35, -1, -1, 36, 37, -1],
                [38, -1, -1, 39, 40, -1, -1, 41, 42, -1, -1, 43, 44, -1, -1, 45, 46, -1, -1],
                [-1, -1, 47, 48, -1, -1, 49, 50, -1, -1, 51, 52, -1, -1, 53, 54, -1, -1, 55],
                [-1, 56, 57, -1, -1, 58, 59, -1, -1, 60, 61, -1, -1, 62, 63, -1, -1, 64, 65],
                [66, 67, -1, -1, 68, 69, -1, -1, 70, 71, -1, -1, 72, 73, -1, -1, 74, 75, -1],
                [76, -1, -1, 77, 78, -1, -1, 79, 80, -1, -1, 81, 82, -1, -1, 83, 84, -1, -1],
                [-1, -1, 85, 86, -1, -1, 87, 88, -1, -1, 89, 90, -1, -1, 91, 92, -1, -1, 93],
                [-1, 94, 95, -1, -1, 96, 97, -1, -1, 98, 99, -1, -1, 100, 101, -1, -1, 102, 103]
            ]

            for (let i = 0; i < arr.length; i++) {
                for (let j = 0; j < arr[i].length; j++) {
                    if (arr[i][j] === -1) {
                        typeArray.push(arr[i][j]);
                    } else {
                        typeArray.push(arr[i][j] % typeCount)
                    }
                }
            }
            shuffleArray(typeArray);
            break;
        default:
            throw new Error(`Unsupported mapId: ${mapId}`);
    }


    for (let i = 0; i < rows * cols; i++) {
        mapData.set(i, {
            id: i,
            type: typeArray[i] === -1 ? `` : `icon-${typeArray[i]}`,
            typeId: typeArray[i],
            isMatched: false,
            isEmpty: typeArray[i] === -1 ? true : false
        });
    }

    return {
        mapData,
        cols,
        rows,
        totalCount,
        typeCount,
    }
}

// 将从服务端获取的数据转为客户端需要的格式，主要是为了适配之前写的代码
// TODO: 优化
export function convertDataForClient(gameBoard: [][]): MatchingData {
    let convertedData = {
        mapData: new Map(),
        cols: gameBoard[0].length,
        rows: gameBoard.length,
        totalCount: 0,
        typeCount: 0,
    }

    let id = 0
    for (let i = 0; i < gameBoard.length; i++) {
        for (let j = 0; j < gameBoard[i].length; j++) {
            convertedData.mapData.set(id, {
                id,
                type: gameBoard[i][j] === -1 ? `` : `icon-${gameBoard[i][j]}`,
                typeId: gameBoard[i][j],
                isMatched: false,
                isEmpty: gameBoard[i][j] === -1 ? true : false
            })
            id++
        }
    }
    // console.log(`将服务端数据转为客户端`, convertedData)
    return convertedData
}

export function convertDataForServer(matchingdata: MatchingData): any {
    let convertedData = []

    let id = 0
    for (let i = 0; i < matchingdata.rows; i++) {
        convertedData.push([])
        for (let j = 0; j < matchingdata.cols; j++) {
            const curData = matchingdata.mapData.get(id)
            convertedData[i].push((curData.isEmpty || curData.isMatched) ? -1 : curData.typeId)
            id++
        }
    }
    // console.log(`将客户端数据转为服务端`, convertedData)
    return convertedData
}