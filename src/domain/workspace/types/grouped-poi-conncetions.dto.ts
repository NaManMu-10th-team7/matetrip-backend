// import { PoiConnectionResDto } from '../dto/poi/poi-connection-res.dto.js';

// export type GroupedPoiConnectionsDto = Record<string, PoiConnectionResDto[]>;
// export const buildGroupedPoiConnectionsDto = (
//   planDayIds: string[],
//   connections: PoiConnectionResDto[],
// ): GroupedPoiConnectionsDto => {
//   const result: GroupedPoiConnectionsDto = {};

//   for (const planDayId of planDayIds) {
//     result[planDayId] = [];
//   }

//   for (const connection of connections) {
//     const list = result[connection.planDayId];
//     if (list) list.push(connection);
//   }

//   return result;
// };
