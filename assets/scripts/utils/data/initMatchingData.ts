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
    totalCount: number,
    typeCount: number,
}

// 洗牌算法
export function shuffleArray(array: any) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        if (array[i] !== -1 && array[j] !== -1) {
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    return array;
}

// TODO: 目前只做这么多吧，主要是用于测试
const typeMap = [
    {
        mapId: 0,
        rows: 12,
        cols: 20,
        typeCount: 30,
        totalCount: 240
    }, {
        mapId: 1,
        rows: 11,
        cols: 19,
        typeCount: 26,
        totalCount: 104 // 算一下
    },
]


// 目前只创建w*h的连连看地图
// TODO: 实现不同类型地图，typeNumber是生成不同地图的代码，但这里先默认是一种
export function initMatchingData(typeId: number = 0): MatchingData {
    const { mapId, cols, rows, typeCount, totalCount } = typeMap[typeId] || { mapId: 0, cols: 12, rows: 20, typeCount: 30, totalCount: 160 };
    // 这个array怎么是一维的？因为要shuffleArray所以必须是一维的，不然也要转换
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
            // 斜的分布，中间隔两行，这里的0，1，2，3...代表个数，typeArray的话是代表type，需要转换
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
            console.log(typeArray)
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