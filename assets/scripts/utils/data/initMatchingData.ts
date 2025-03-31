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
        rows: 12,
        cols: 20,
        typeCount: 30,
        totalCount: 240 // 算一下
    },
]


// 目前只创建w*h的连连看地图
// TODO: 实现不同类型地图，typeNumber是生成不同地图的代码，但这里先默认是一种
export function initMatchingData(typeId: number = 0): MatchingData {
    const { mapId, cols, rows, typeCount, totalCount } = typeMap[typeId] || { mapId: 0, cols: 12, rows: 20, typeCount: 30, totalCount: 160 };
    const typeArray = []

    if (totalCount % 2 === 1) throw new Error("totalCount must be even")
    if (totalCount % (typeCount * 2) !== 0) throw new Error("totalCount must be divisible by typeCount * 2")

    const mapData = new Map<number, MatchingCell>();

    switch (mapId) {
        case 0:
            // 没有间隙
            for (let i = 0; i < totalCount / typeCount; i++) {
                for (let j = 0; j < typeCount; j++) {
                    typeArray.push(j);
                }
            }
            shuffleArray(typeArray);
            break;
        case 1:
            // 斜的分布，中间隔两行
            for (let i = 0; i < totalCount / typeCount; i++) {
                for (let j = 0; j < typeCount; j++) {
                    typeArray.push(j);
                }
            }
            shuffleArray(typeArray);
            break;
        default:
            throw new Error(`Unsupported mapId: ${mapId}`);
    }



    for (let i = 0; i < totalCount; i++) {
        mapData.set(i, {
            id: i,
            type: `icon-${typeArray[i]}`,
            typeId: typeArray[i],
            isMatched: false,
            isEmpty: false
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