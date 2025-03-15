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
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


// 目前只创建w*h的连连看地图
// TODO: 实现不同类型地图，typeNumber是生成不同地图的代码，但这里先默认是一种
export function initiateMatchingData(rows: number = 10, cols: number = 15, typeNumber: number = 15): MatchingData {
    const totalCount = cols * rows;
    const typeCount = typeNumber
    const typeArray = []

    if (totalCount % 2 === 1) throw new Error("totalCount must be even")

    const mapData = new Map<number, MatchingCell>();

    // 假设现在有15中不同元素，并且数量相同，每个10个
    // TODO: 根据不同的地图，分布是不同的，目前就当成是均匀分布

    if (totalCount % (typeCount * 2) !== 0) throw new Error("totalCount must be divisible by typeCount * 2")
    for (let i = 0; i < totalCount / typeCount; i++) {
        for (let j = 0; j < typeCount; j++) {
            typeArray.push(j);
        }
    }
    shuffleArray(typeArray);
    // console.log(typeArray)

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