/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface Agreements {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  subprojects_id?: number;
  /** @format date-time */
  register_date?: string | null;
  notes?: string | null;
  /** @format int32 */
  users_id?: number;
}

export interface AuthenticateRequest {
  /** @minLength 1 */
  username: string;
  /** @minLength 1 */
  password: string;
}

export interface ChatGPT {
  context?: string | null;
  question?: string | null;
}

export interface Companies {
  /** @format int32 */
  id?: number;
  name?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  logo?: string | null;
  logo_white?: string | null;
  w9_page?: string | null;
  tag?: string | null;
  document_background?: string | null;
  document_sign?: string | null;
  status?: string | null;
}

export interface Customers {
  /** @format int64 */
  id?: number;
  first_name?: string | null;
  second_name?: string | null;
  last_name?: string | null;
  /** @format date-time */
  birthday?: string | null;
  picture?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  notes?: string | null;
  /** @format date-time */
  register_date?: string;
  /** @format int32 */
  pid_properties?: number;
  /** @format int32 */
  mid_properties?: number;
}

export interface CustomersDto {
  /** @format int64 */
  id?: number;
  first_name?: string | null;
  second_name?: string | null;
  last_name?: string | null;
  /** @format date-time */
  birthday?: string | null;
  picture?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  notes?: string | null;
  /** @format date-time */
  register_date?: string | null;
  /** @format int32 */
  pid_properties?: number;
  pid_address?: string | null;
  pid_address2?: string | null;
  pid_unit?: string | null;
  pid_city?: string | null;
  pid_state?: string | null;
  pid_postalcode?: string | null;
  pid_country?: string | null;
  /** @format int32 */
  mid_properties?: number;
  mid_address?: string | null;
  mid_address2?: string | null;
  mid_unit?: string | null;
  mid_city?: string | null;
  mid_state?: string | null;
  mid_postalcode?: string | null;
  mid_country?: string | null;
}

export interface Roles {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export interface RolesDto {
  /** @format int32 */
  id?: number;
  name?: string | null;
  access?: number[] | null;
}

export interface RolesDto2 {
  /** @format int32 */
  id?: number;
  rolename?: string | null;
  endpoint?: string | null;
  accessarray?: string[] | null;
}

export interface TblAccess {
  /** @format int32 */
  id?: number;
  name?: string | null;
  endpoint?: string | null;
  metodo?: string | null;
  /** @format int32 */
  parentAccess?: number;
  /** @format int32 */
  position?: number;
}

export interface TblBankaccount {
  /** @format int32 */
  id?: number;
  customerId?: string | null;
  /** @format int32 */
  companiesId?: number;
  tokenType?: string | null;
  token?: string | null;
  itemId?: string | null;
  requestId?: string | null;
}

export interface TblCategory {
  /** @format int32 */
  id?: number;
  name?: string | null;
  type?: string | null;
}

export interface TblChatmessage {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  chatroomId?: number;
  /** @format int32 */
  userId?: number;
  message?: string | null;
  /** @format date-time */
  time?: string;
  attach?: string | null;
  /** @format int32 */
  replymessageId?: number;
  status?: string | null;
  type?: string | null;
}

export interface TblChatroom {
  /** @format int32 */
  id?: number;
  subject?: string | null;
}

export interface TblChatroomuser {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  chatroomId?: number;
  /** @format int32 */
  userId?: number;
}

export interface TblComment {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  updateId?: number;
  /** @format int32 */
  usersId?: number;
  message?: string | null;
  /** @format date-time */
  time?: string;
}

export interface TblDepartment {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export interface TblEmployee {
  /** @format int32 */
  id?: number;
  firstName?: string | null;
  secondName?: string | null;
  lastName?: string | null;
  /** @format date */
  birthday?: string;
  /** @format int32 */
  gender?: number;
  picture?: string | null;
  personalPhone?: string | null;
  personalMobile?: string | null;
  personalEmail?: string | null;
  /** @format int32 */
  propertiesId?: number;
  /** @format int32 */
  companiesId?: number;
  /** @format int32 */
  jobsId?: number;
  link?: string | null;
  face?: string | null;
  inst?: string | null;
  book?: string | null;
  notes?: string | null;
  /** @format date */
  registerDate?: string;
}

export interface TblEstimate {
  /** @format int32 */
  id?: number;
  note?: string | null;
  /** @format int32 */
  status?: number;
  /** @format date-time */
  createdDate?: string;
  /** @format int32 */
  usersId?: number;
  /** @format int32 */
  pstType?: number;
  /** @format int64 */
  worksId?: number;
}

export interface TblEstimateproduct {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  estimatesId?: number;
  /** @format int32 */
  productId?: number;
  description?: string | null;
  /** @format double */
  price?: number;
  /** @format double */
  qty?: number;
  /** @format int32 */
  order?: number;
  estimates?: TblEstimate;
  product?: TblProduct;
}

export interface TblEvent {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  worksId?: number;
  /** @format int32 */
  eventtypesId?: number;
  /** @format date-time */
  registerDate?: string;
  notes?: string | null;
  file?: boolean;
  /** @format int32 */
  usersId?: number | null;
}

export interface TblEventsfile {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  eventsId?: number;
  url?: string | null;
  type?: string | null;
  /** @format date-time */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
}

export interface TblEventszone {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  eventsId?: number;
  /** @format int32 */
  zonetypesId?: number;
  /** @format double */
  large?: number;
  /** @format double */
  width?: number;
  /** @format double */
  height?: number;
  /** @format date-time */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
}

export interface TblEventszonesfile {
  /** @format int32 */
  id?: number;
  /** @format int64 */
  eventszonesId?: number;
  url?: string | null;
  type?: string | null;
  /** @format date-time */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
}

export interface TblEventtype {
  /** @format int32 */
  id?: number;
  name?: string | null;
  color?: string | null;
  department?: string | null;
  file?: boolean;
}

export interface TblExternalcompany {
  /** @format int32 */
  id?: number;
  name?: string | null;
  type?: string | null;
  phone?: string | null;
  ext?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  address2?: string | null;
  address3?: string | null;
  city?: string | null;
  state?: string | null;
  postalcode?: string | null;
  country?: string | null;
}

export interface TblExternalemployee {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  externalcompaniesId?: number;
  fullname?: string | null;
  mobile?: string | null;
  phone?: string | null;
  ext?: string | null;
  email?: string | null;
}

export interface TblJob {
  /** @format int32 */
  id?: number;
  name?: string | null;
  /** @format int32 */
  departmentsId?: number;
}

export interface TblLead {
  /** @format int64 */
  id?: number;
  nickname?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  lastName?: string | null;
  /** @format int32 */
  owner2?: number;
  fistName2?: string | null;
  lastName2?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  /** @format date */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
  /** @format int32 */
  companiesId?: number;
  /** @format int32 */
  pidProperties?: number;
  /** @format int32 */
  midProperties?: number;
}

export interface TblPlaidtransaction {
  /** @format int32 */
  id?: number;
  accountId?: string | null;
  accountOwner?: string | null;
  amount?: string | null;
  payment?: string | null;
  categoryId?: string | null;
  /** @format date */
  date?: string | null;
  isoCurrencyCode?: string | null;
  location?: string | null;
  name?: string | null;
  byOrderOf?: string | null;
  payee?: string | null;
  payer?: string | null;
  paymentMethod?: string | null;
  paymentProcessor?: string | null;
  ppdId?: string | null;
  reason?: string | null;
  referenceNumber?: string | null;
  pending?: string | null;
  pendingTransactionId?: string | null;
  transactionId?: string | null;
  transactionType?: string | null;
  used?: boolean;
}

export interface TblProduct {
  /** @format int32 */
  id?: number;
  name?: string | null;
  alias?: string | null;
  description?: string | null;
  /** @format int32 */
  type?: number;
  /** @format int32 */
  categoryId?: number;
  /** @format double */
  price?: number;
  image?: string | null;
  /** @format int32 */
  qty?: number;
  unit?: string | null;
  /** @format date-time */
  regdate?: string;
}

export interface TblProductserial {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  productId?: number;
  serial?: string | null;
  status?: string | null;
}

export interface TblProject {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  projecttypesId?: number;
  internalId?: string | null;
  /** @format int32 */
  status?: number;
  /** @format date-time */
  createdDate?: string;
  /** @format int64 */
  leadsId?: number;
  /** @format int64 */
  customersId?: number;
  /** @format int32 */
  usersId?: number;
  /** @format int32 */
  propertiesId?: number;
}

export interface TblProjectfile {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  projectsId?: number;
  /** @format int32 */
  filetypeId?: number;
  url?: string | null;
  /** @format date-time */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
}

export interface TblProjecttype {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export interface TblProperty {
  /** @format int32 */
  id?: number;
  address?: string | null;
  address2?: string | null;
  unit?: string | null;
  city?: string | null;
  state?: string | null;
  postalcode?: string | null;
  country?: string | null;
  /** @format int32 */
  type?: number;
  /** @format int32 */
  yearBuilt?: number;
  /** @format double */
  totalpurchaseprice?: number;
}

export interface TblScopesheet {
  /** @format int32 */
  id?: number;
  /** @format int64 */
  subprojectsId?: number;
  /** @format date-time */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
}

export interface TblScopesheetfile {
  /** @format int32 */
  id?: number;
  url?: string | null;
  /** @format int32 */
  scopesheetId?: number;
  /** @format date-time */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
}

export interface TblScopesheetzone {
  /** @format int32 */
  id?: number;
  name?: string | null;
  /** @format int32 */
  scopesheetId?: number;
  /** @format date-time */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
}

export interface TblShift {
  /** @format int32 */
  id?: number;
  /** @format int64 */
  subprojectsId?: number;
  /** @format date-time */
  startTime?: string;
  /** @format date-time */
  endTime?: string;
  /** @format int32 */
  startPropertiesId?: number;
  /** @format int32 */
  endPropertiesId?: number;
  /** @format int32 */
  usersId?: number;
}

export interface TblSubproject {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  subprojecttypesId?: number;
  /** @format int32 */
  status?: number;
  /** @format date-time */
  createdDate?: string;
  /** @format date-time */
  finishedDate?: string;
  /** @format date-time */
  updatedDate?: string;
  /** @format int32 */
  usersId?: number;
  /** @format int64 */
  projectsId?: number;
  notes?: string | null;
}

export interface TblSubprojectfile {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  subprojectsId?: number;
  /** @format int32 */
  filetypeId?: number;
  url?: string | null;
  /** @format date-time */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
}

export interface TblSubprojectpolicya {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  subprojectsId?: number | null;
  insuranceCompany?: string | null;
  policyNumber?: string | null;
  claimNumber?: string | null;
  causeLoss?: string | null;
  insuranceInspection?: string | null;
  /** @format date-time */
  dateloss?: string | null;
  statusclaim?: string | null;
  firstclaim?: string | null;
  visibledamage?: string | null;
  visibledamageNotes?: string | null;
  stateEmergency?: string | null;
  lastclaimNotes?: string | null;
  descriptionlossNotes?: string | null;
  additionalNotes?: string | null;
  statusInternal?: string | null;
  /** @format double */
  dwellingAmount?: number | null;
  /** @format double */
  dwellingLimit?: number | null;
  /** @format double */
  deductibleAmount?: number | null;
  denialReason?: string | null;
  /** @format date-time */
  registerDate?: string | null;
  /** @format int32 */
  usersId?: number | null;
}

export interface TblSubprojecttype {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export interface TblSubtemplate {
  /** @format int32 */
  id?: number;
  name?: string | null;
  description?: string | null;
  /** @format int32 */
  usersId?: number;
}

export interface TblSubtemplateproduct {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  subtemplatesId?: number;
  /** @format int32 */
  productId?: number;
  /** @format double */
  qty?: number;
  /** @format int32 */
  order?: number;
}

export interface TblTemplate {
  /** @format int32 */
  id?: number;
  name?: string | null;
  description?: string | null;
  /** @format int32 */
  usersId?: number;
}

export interface TblUpdate {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  usersId?: number;
  message?: string | null;
  /** @format date-time */
  time?: string;
  state?: string | null;
  background?: string | null;
  attach?: string | null;
  attachType?: string | null;
}

export interface TblUpdatelike {
  /** @format int32 */
  id?: number;
  /** @format int32 */
  usersId?: number;
  /** @format int32 */
  updateId?: number;
}

export interface TblWallet {
  /** @format int32 */
  id?: number;
  name?: string | null;
  type?: string | null;
  /** @format int32 */
  idType?: number;
  /** @format int32 */
  usersId?: number;
  category?: string | null;
  irscategory?: string | null;
}

export interface TblWallettransaction {
  /** @format int32 */
  id?: number;
  subject?: string | null;
  /** @format double */
  amount?: number | null;
  /** @format int32 */
  walletIdFrom?: number;
  /** @format int32 */
  walletIdTo?: number;
  /** @format int32 */
  type?: number;
  /** @format int32 */
  banktransid?: number;
  /** @format date-time */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
}

export interface TblZonetype {
  /** @format int32 */
  id?: number;
  zonename?: string | null;
}

export interface Users {
  /** @format int32 */
  id?: number;
  username?: string | null;
  password?: string | null;
  status?: string | null;
  /** @format int32 */
  employees_id?: number;
  /** @format int32 */
  roles_id?: number;
  /** @format date-time */
  lastactivity?: string;
}

export interface UsersDto {
  /** @format int32 */
  id?: number;
  first_name?: string | null;
  last_name?: string | null;
  picture?: string | null;
  username?: string | null;
  password?: string | null;
  status?: string | null;
  personal_email?: string | null;
  personal_phone?: string | null;
  /** @format int32 */
  employees_id?: number;
  /** @format int32 */
  roles_id?: number;
  /** @format date-time */
  lastactivity?: string;
  departmentname?: string | null;
  jobname?: string | null;
  tag?: string | null;
  /** @format int32 */
  companies_id?: number;
  token?: string | null;
  rolename?: string | null;
  accessname?: string | null;
  seccod?: string | null;
}

export interface UsersSummary {
  /** @format int32 */
  id?: number;
  /** @format date-time */
  date?: string;
  user?: string | null;
  extS?: string | null;
  phoneNumbers?: string | null;
  /** @format int32 */
  totalCalls?: number | null;
  totalCallDuration?: string | null;
  /** @format int32 */
  inboundCalls?: number | null;
  inboundCallDuration?: string | null;
  /** @format int32 */
  outboundCalls?: number | null;
  outboundCallDuration?: string | null;
  /** @format int32 */
  intraPbxCalls?: number | null;
  intraPbxCallDuration?: string | null;
  /** @format int32 */
  missedCalls?: number | null;
  /** @format int32 */
  answeredCalls?: number | null;
  /** @format int32 */
  voicemailCalls?: number | null;
}

export interface ViewJob {
  /** @format int32 */
  id?: number;
  name?: string | null;
  /** @format int32 */
  departmentsId?: number;
  departmentname?: string | null;
}

export interface ViewLead {
  /** @format int64 */
  id?: number;
  nickname?: string | null;
  firstName?: string | null;
  secondName?: string | null;
  lastName?: string | null;
  /** @format int32 */
  owner2?: number;
  fistName2?: string | null;
  lastName2?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  /** @format date */
  registerDate?: string;
  /** @format int32 */
  companiesId?: number;
  /** @format int32 */
  pidProperties?: number;
  /** @format int32 */
  midProperties?: number;
  pidAddress?: string | null;
  pidAddress2?: string | null;
  pidUnit?: string | null;
  pidCity?: string | null;
  pidState?: string | null;
  pidPostalcode?: string | null;
  pidCountry?: string | null;
  /** @format int32 */
  yearBuilt?: number;
  /** @format double */
  totalpurchaseprice?: number;
  midAddress?: string | null;
  midAddress2?: string | null;
  midUnit?: string | null;
  midCity?: string | null;
  midState?: string | null;
  midPostalcode?: string | null;
  midCountry?: string | null;
  /** @format int32 */
  usersId?: number;
  usersName?: string | null;
  tag?: string | null;
}

export interface ViewRoommessage {
  /** @format int32 */
  id?: number;
  subject?: string | null;
  /** @format int32 */
  userId?: number;
}

export interface ViewUserroom {
  /** @format int32 */
  id?: number;
  subject?: string | null;
  /** @format int32 */
  userId?: number;
}

export interface ViewUserschat {
  /** @format int32 */
  id?: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  personalMobile?: string | null;
  personalEmail?: string | null;
  /** @format date */
  birthday?: string;
}

export interface ViewWallettran {
  /** @format int32 */
  id?: number;
  subject?: string | null;
  name?: string | null;
  /** @format double */
  amount?: number | null;
  /** @format int32 */
  walletIdFrom?: number;
  /** @format int32 */
  walletIdTo?: number;
  /** @format int32 */
  type?: number;
  /** @format int32 */
  banktransid?: number;
  /** @format date-time */
  registerDate?: string;
  /** @format int32 */
  usersId?: number;
}

export interface Works {
  /** @format int64 */
  id?: number;
  /** @format int64 */
  subprojects_id?: number;
  /** @format int32 */
  worktypes_id?: number;
  status?: string | null;
  /** @format date-time */
  register_date?: string | null;
  /** @format int32 */
  users_id?: number;
}

export interface Worktypes {
  /** @format int32 */
  id?: number;
  name?: string | null;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(
      typeof value === "number" ? value : `${value}`
    )}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key]
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key)
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) =>
      Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
            ? JSON.stringify(property)
            : `${property}`
        );
        return formData;
      }, new FormData()),
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<HttpResponse<T, E>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${
        queryString ? `?${queryString}` : ""
      }`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal: cancelToken
          ? this.createAbortSignal(cancelToken)
          : requestParams.signal,
        body:
          typeof body === "undefined" || body === null
            ? null
            : payloadFormatter(body),
      }
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data;
    });
  };
}

/**
 * @title rcCoreAPI
 * @version 1.0
 */
export class Api<
  SecurityDataType extends unknown
> extends HttpClient<SecurityDataType> {
  api = {
    /**
     * No description
     *
     * @tags Access
     * @name V1AccessCreate
     * @request POST:/api/v1/Access
     */
    v1AccessCreate: (data: TblAccess, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Access`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Access
     * @name V1AccessList
     * @request GET:/api/v1/Access
     */
    v1AccessList: (params: RequestParams = {}) =>
      this.request<TblAccess[], any>({
        path: `/api/v1/Access`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Access
     * @name V1AccessUpdate
     * @request PUT:/api/v1/Access
     */
    v1AccessUpdate: (data: TblAccess, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Access`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Access
     * @name V1AccessDetail
     * @request GET:/api/v1/Access/{id}
     */
    v1AccessDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblAccess, any>({
        path: `/api/v1/Access/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Access
     * @name V1AccessDelete
     * @request DELETE:/api/v1/Access/{id}
     */
    v1AccessDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Access/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Agreements
     * @name V1AgreementsCreate
     * @request POST:/api/v1/Agreements
     */
    v1AgreementsCreate: (data: Agreements, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Agreements`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Agreements
     * @name V1AgreementsList
     * @request GET:/api/v1/Agreements
     */
    v1AgreementsList: (params: RequestParams = {}) =>
      this.request<Agreements[], any>({
        path: `/api/v1/Agreements`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Agreements
     * @name V1AgreementsUpdate
     * @request PUT:/api/v1/Agreements
     */
    v1AgreementsUpdate: (data: Agreements, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Agreements`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Agreements
     * @name V1AgreementsDetail
     * @request GET:/api/v1/Agreements/{id}
     */
    v1AgreementsDetail: (id: string, params: RequestParams = {}) =>
      this.request<Agreements, any>({
        path: `/api/v1/Agreements/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Agreements
     * @name V1AgreementsDelete
     * @request DELETE:/api/v1/Agreements/{id}
     */
    v1AgreementsDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Agreements/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Bankaccount
     * @name V1BankaccountCreate
     * @request POST:/api/v1/Bankaccount
     */
    v1BankaccountCreate: (data: TblBankaccount, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Bankaccount`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Bankaccount
     * @name V1BankaccountList
     * @request GET:/api/v1/Bankaccount
     */
    v1BankaccountList: (params: RequestParams = {}) =>
      this.request<TblBankaccount[], any>({
        path: `/api/v1/Bankaccount`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Bankaccount
     * @name V1BankaccountUpdate
     * @request PUT:/api/v1/Bankaccount
     */
    v1BankaccountUpdate: (data: TblBankaccount, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Bankaccount`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Bankaccount
     * @name V1BankaccountDetail
     * @request GET:/api/v1/Bankaccount/{id}
     */
    v1BankaccountDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblBankaccount, any>({
        path: `/api/v1/Bankaccount/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Bankaccount
     * @name V1BankaccountDelete
     * @request DELETE:/api/v1/Bankaccount/{id}
     */
    v1BankaccountDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Bankaccount/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Botai
     * @name V1BotaiList
     * @request GET:/api/v1/Botai
     */
    v1BotaiList: (data: ChatGPT, params: RequestParams = {}) =>
      this.request<string, any>({
        path: `/api/v1/Botai`,
        method: "GET",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Category
     * @name V1CategoryCreate
     * @request POST:/api/v1/Category
     */
    v1CategoryCreate: (data: TblCategory, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Category`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Category
     * @name V1CategoryList
     * @request GET:/api/v1/Category
     */
    v1CategoryList: (params: RequestParams = {}) =>
      this.request<TblCategory[], any>({
        path: `/api/v1/Category`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Category
     * @name V1CategoryUpdate
     * @request PUT:/api/v1/Category
     */
    v1CategoryUpdate: (data: TblCategory, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Category`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Category
     * @name V1CategoryDetail
     * @request GET:/api/v1/Category/{id}
     */
    v1CategoryDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblCategory, any>({
        path: `/api/v1/Category/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Category
     * @name V1CategoryDelete
     * @request DELETE:/api/v1/Category/{id}
     */
    v1CategoryDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Category/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatmessage
     * @name V1ChatmessageCreate
     * @request POST:/api/v1/Chatmessage
     */
    v1ChatmessageCreate: (data: TblChatmessage, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Chatmessage`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatmessage
     * @name V1ChatmessageList
     * @request GET:/api/v1/Chatmessage
     */
    v1ChatmessageList: (
      query?: {
        /** @format int32 */
        Page?: number;
        /** @format int32 */
        Count?: number;
        /** @format int32 */
        Order?: number;
      },
      params: RequestParams = {}
    ) =>
      this.request<TblChatmessage[], any>({
        path: `/api/v1/Chatmessage`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatmessage
     * @name V1ChatmessageUpdate
     * @request PUT:/api/v1/Chatmessage
     */
    v1ChatmessageUpdate: (data: TblChatmessage, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Chatmessage`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatmessage
     * @name V1ChatmessageDetail
     * @request GET:/api/v1/Chatmessage/{id}
     */
    v1ChatmessageDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblChatmessage, any>({
        path: `/api/v1/Chatmessage/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatmessage
     * @name V1ChatmessageDelete
     * @request DELETE:/api/v1/Chatmessage/{id}
     */
    v1ChatmessageDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Chatmessage/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatmessage
     * @name V1ChatmessageSearchList
     * @request GET:/api/v1/Chatmessage/search
     */
    v1ChatmessageSearchList: (
      query?: {
        /** @format int32 */
        Page?: number;
        /** @format int32 */
        Count?: number;
        /** @format int32 */
        Order?: number;
        /** @format int32 */
        ChatroomId?: number;
        /** @format int32 */
        UserId?: number;
        /** @format date-time */
        Time?: string;
      },
      params: RequestParams = {}
    ) =>
      this.request<TblChatmessage[], any>({
        path: `/api/v1/Chatmessage/search`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroom
     * @name V1ChatroomCreate
     * @request POST:/api/v1/Chatroom
     */
    v1ChatroomCreate: (data: TblChatroom, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Chatroom`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroom
     * @name V1ChatroomList
     * @request GET:/api/v1/Chatroom
     */
    v1ChatroomList: (params: RequestParams = {}) =>
      this.request<TblChatroom[], any>({
        path: `/api/v1/Chatroom`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroom
     * @name V1ChatroomUpdate
     * @request PUT:/api/v1/Chatroom
     */
    v1ChatroomUpdate: (data: TblChatroom, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Chatroom`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroom
     * @name V1ChatroomDetail
     * @request GET:/api/v1/Chatroom/{id}
     */
    v1ChatroomDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblChatroom, any>({
        path: `/api/v1/Chatroom/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroom
     * @name V1ChatroomDelete
     * @request DELETE:/api/v1/Chatroom/{id}
     */
    v1ChatroomDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Chatroom/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroom
     * @name V1ChatroomOwneruserDetail
     * @request GET:/api/v1/Chatroom/owneruser/{id}
     */
    v1ChatroomOwneruserDetail: (
      id: number,
      query?: {
        /** @format int32 */
        Page?: number;
        /** @format int32 */
        Count?: number;
        /** @format int32 */
        Order?: number;
      },
      params: RequestParams = {}
    ) =>
      this.request<ViewUserroom[], any>({
        path: `/api/v1/Chatroom/owneruser/${id}`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroom
     * @name V1ChatroomRoomusersDetail
     * @request GET:/api/v1/Chatroom/roomusers/{id}
     */
    v1ChatroomRoomusersDetail: (id: number, params: RequestParams = {}) =>
      this.request<ViewRoommessage[], any>({
        path: `/api/v1/Chatroom/roomusers/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroomuser
     * @name V1ChatroomuserCreate
     * @request POST:/api/v1/Chatroomuser
     */
    v1ChatroomuserCreate: (data: TblChatroomuser, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Chatroomuser`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroomuser
     * @name V1ChatroomuserList
     * @request GET:/api/v1/Chatroomuser
     */
    v1ChatroomuserList: (params: RequestParams = {}) =>
      this.request<TblChatroomuser[], any>({
        path: `/api/v1/Chatroomuser`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroomuser
     * @name V1ChatroomuserUpdate
     * @request PUT:/api/v1/Chatroomuser
     */
    v1ChatroomuserUpdate: (data: TblChatroomuser, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Chatroomuser`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroomuser
     * @name V1ChatroomuserDetail
     * @request GET:/api/v1/Chatroomuser/{id}
     */
    v1ChatroomuserDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblChatroomuser, any>({
        path: `/api/v1/Chatroomuser/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroomuser
     * @name V1ChatroomuserDelete
     * @request DELETE:/api/v1/Chatroomuser/{id}
     */
    v1ChatroomuserDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Chatroomuser/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chatroomuser
     * @name V1ChatroomuserBychatroomDetail
     * @request GET:/api/v1/Chatroomuser/bychatroom/{id}
     */
    v1ChatroomuserBychatroomDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblChatroomuser[], any>({
        path: `/api/v1/Chatroomuser/bychatroom/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Comment
     * @name V1CommentCreate
     * @request POST:/api/v1/Comment
     */
    v1CommentCreate: (data: TblComment, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Comment`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Comment
     * @name V1CommentList
     * @request GET:/api/v1/Comment
     */
    v1CommentList: (params: RequestParams = {}) =>
      this.request<TblComment[], any>({
        path: `/api/v1/Comment`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Comment
     * @name V1CommentUpdate
     * @request PUT:/api/v1/Comment
     */
    v1CommentUpdate: (data: TblComment, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Comment`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Comment
     * @name V1CommentListList
     * @request GET:/api/v1/Comment/list
     */
    v1CommentListList: (
      query?: {
        /** @format int32 */
        Page?: number;
        /** @format int32 */
        Count?: number;
        /** @format int32 */
        Order?: number;
      },
      params: RequestParams = {}
    ) =>
      this.request<TblComment[], any>({
        path: `/api/v1/Comment/list`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Comment
     * @name V1CommentDetail
     * @request GET:/api/v1/Comment/{id}
     */
    v1CommentDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblComment, any>({
        path: `/api/v1/Comment/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Comment
     * @name V1CommentDelete
     * @request DELETE:/api/v1/Comment/{id}
     */
    v1CommentDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Comment/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Companies
     * @name V1CompaniesCreate
     * @request POST:/api/v1/Companies
     */
    v1CompaniesCreate: (data: Companies, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Companies`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Companies
     * @name V1CompaniesList
     * @request GET:/api/v1/Companies
     */
    v1CompaniesList: (params: RequestParams = {}) =>
      this.request<Companies[], any>({
        path: `/api/v1/Companies`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Companies
     * @name V1CompaniesUpdate
     * @request PUT:/api/v1/Companies
     */
    v1CompaniesUpdate: (data: Companies, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Companies`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Companies
     * @name V1CompaniesDetail
     * @request GET:/api/v1/Companies/{id}
     */
    v1CompaniesDetail: (id: string, params: RequestParams = {}) =>
      this.request<Companies, any>({
        path: `/api/v1/Companies/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Companies
     * @name V1CompaniesDelete
     * @request DELETE:/api/v1/Companies/{id}
     */
    v1CompaniesDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Companies/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Customers
     * @name V1CustomersCreate
     * @request POST:/api/v1/Customers
     */
    v1CustomersCreate: (data: Customers, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Customers`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Customers
     * @name V1CustomersList
     * @request GET:/api/v1/Customers
     */
    v1CustomersList: (params: RequestParams = {}) =>
      this.request<CustomersDto[], any>({
        path: `/api/v1/Customers`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Customers
     * @name V1CustomersUpdate
     * @request PUT:/api/v1/Customers
     */
    v1CustomersUpdate: (data: Customers, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Customers`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Customers
     * @name V1CustomersDetail
     * @request GET:/api/v1/Customers/{id}
     */
    v1CustomersDetail: (id: string, params: RequestParams = {}) =>
      this.request<CustomersDto, any>({
        path: `/api/v1/Customers/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Customers
     * @name V1CustomersDelete
     * @request DELETE:/api/v1/Customers/{id}
     */
    v1CustomersDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Customers/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Departments
     * @name V1DepartmentsCreate
     * @request POST:/api/v1/Departments
     */
    v1DepartmentsCreate: (data: TblDepartment, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Departments`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Departments
     * @name V1DepartmentsList
     * @request GET:/api/v1/Departments
     */
    v1DepartmentsList: (params: RequestParams = {}) =>
      this.request<TblDepartment[], any>({
        path: `/api/v1/Departments`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Departments
     * @name V1DepartmentsUpdate
     * @request PUT:/api/v1/Departments
     */
    v1DepartmentsUpdate: (data: TblDepartment, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Departments`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Departments
     * @name V1DepartmentsDetail
     * @request GET:/api/v1/Departments/{id}
     */
    v1DepartmentsDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblDepartment, any>({
        path: `/api/v1/Departments/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Departments
     * @name V1DepartmentsDelete
     * @request DELETE:/api/v1/Departments/{id}
     */
    v1DepartmentsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Departments/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Employees
     * @name V1EmployeesCreate
     * @request POST:/api/v1/Employees
     */
    v1EmployeesCreate: (data: TblEmployee, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Employees`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Employees
     * @name V1EmployeesList
     * @request GET:/api/v1/Employees
     */
    v1EmployeesList: (params: RequestParams = {}) =>
      this.request<TblEmployee[], any>({
        path: `/api/v1/Employees`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Employees
     * @name V1EmployeesUpdate
     * @request PUT:/api/v1/Employees
     */
    v1EmployeesUpdate: (data: TblEmployee, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Employees`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Employees
     * @name V1EmployeesDetail
     * @request GET:/api/v1/Employees/{id}
     */
    v1EmployeesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblEmployee, any>({
        path: `/api/v1/Employees/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Employees
     * @name V1EmployeesDelete
     * @request DELETE:/api/v1/Employees/{id}
     */
    v1EmployeesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Employees/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimateproducts
     * @name V1EstimateproductsCreate
     * @request POST:/api/v1/Estimateproducts
     */
    v1EstimateproductsCreate: (
      data: TblEstimateproduct,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Estimateproducts`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimateproducts
     * @name V1EstimateproductsList
     * @request GET:/api/v1/Estimateproducts
     */
    v1EstimateproductsList: (params: RequestParams = {}) =>
      this.request<TblEstimateproduct[], any>({
        path: `/api/v1/Estimateproducts`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimateproducts
     * @name V1EstimateproductsUpdate
     * @request PUT:/api/v1/Estimateproducts
     */
    v1EstimateproductsUpdate: (
      data: TblEstimateproduct,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Estimateproducts`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimateproducts
     * @name V1EstimateproductsDetail
     * @request GET:/api/v1/Estimateproducts/{id}
     */
    v1EstimateproductsDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblEstimateproduct, any>({
        path: `/api/v1/Estimateproducts/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimateproducts
     * @name V1EstimateproductsDelete
     * @request DELETE:/api/v1/Estimateproducts/{id}
     */
    v1EstimateproductsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Estimateproducts/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimateproducts
     * @name V1EstimateproductsEstimateDetail
     * @request GET:/api/v1/Estimateproducts/estimate/{id}
     */
    v1EstimateproductsEstimateDetail: (
      id: number,
      params: RequestParams = {}
    ) =>
      this.request<TblEstimateproduct[], any>({
        path: `/api/v1/Estimateproducts/estimate/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimates
     * @name V1EstimatesCreate
     * @request POST:/api/v1/Estimates
     */
    v1EstimatesCreate: (data: TblEstimate, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Estimates`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimates
     * @name V1EstimatesList
     * @request GET:/api/v1/Estimates
     */
    v1EstimatesList: (params: RequestParams = {}) =>
      this.request<TblEstimate[], any>({
        path: `/api/v1/Estimates`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimates
     * @name V1EstimatesUpdate
     * @request PUT:/api/v1/Estimates
     */
    v1EstimatesUpdate: (data: TblEstimate, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Estimates`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimates
     * @name V1EstimatesDetail
     * @request GET:/api/v1/Estimates/{id}
     */
    v1EstimatesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblEstimate, any>({
        path: `/api/v1/Estimates/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimates
     * @name V1EstimatesDelete
     * @request DELETE:/api/v1/Estimates/{id}
     */
    v1EstimatesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Estimates/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Estimates
     * @name V1EstimatesWorksDetail
     * @request GET:/api/v1/Estimates/works/{id}
     */
    v1EstimatesWorksDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblEstimate[], any>({
        path: `/api/v1/Estimates/works/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Events
     * @name V1EventsCreate
     * @request POST:/api/v1/Events
     */
    v1EventsCreate: (data: TblEvent, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Events`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Events
     * @name V1EventsList
     * @request GET:/api/v1/Events
     */
    v1EventsList: (params: RequestParams = {}) =>
      this.request<TblEvent[], any>({
        path: `/api/v1/Events`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Events
     * @name V1EventsUpdate
     * @request PUT:/api/v1/Events
     */
    v1EventsUpdate: (data: TblEvent, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Events`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Events
     * @name V1EventsDetail
     * @request GET:/api/v1/Events/{id}
     */
    v1EventsDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblEvent, any>({
        path: `/api/v1/Events/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Events
     * @name V1EventsDelete
     * @request DELETE:/api/v1/Events/{id}
     */
    v1EventsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Events/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventsfiles
     * @name V1EventsfilesCreate
     * @request POST:/api/v1/Eventsfiles
     */
    v1EventsfilesCreate: (data: TblEventsfile, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Eventsfiles`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventsfiles
     * @name V1EventsfilesList
     * @request GET:/api/v1/Eventsfiles
     */
    v1EventsfilesList: (params: RequestParams = {}) =>
      this.request<TblEventsfile[], any>({
        path: `/api/v1/Eventsfiles`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventsfiles
     * @name V1EventsfilesUpdate
     * @request PUT:/api/v1/Eventsfiles
     */
    v1EventsfilesUpdate: (data: TblEventsfile, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Eventsfiles`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventsfiles
     * @name V1EventsfilesDetail
     * @request GET:/api/v1/Eventsfiles/{id}
     */
    v1EventsfilesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblEventsfile, any>({
        path: `/api/v1/Eventsfiles/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventsfiles
     * @name V1EventsfilesDelete
     * @request DELETE:/api/v1/Eventsfiles/{id}
     */
    v1EventsfilesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Eventsfiles/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventszones
     * @name V1EventszonesCreate
     * @request POST:/api/v1/Eventszones
     */
    v1EventszonesCreate: (data: TblEventszone, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Eventszones`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventszones
     * @name V1EventszonesList
     * @request GET:/api/v1/Eventszones
     */
    v1EventszonesList: (params: RequestParams = {}) =>
      this.request<TblEventszone[], any>({
        path: `/api/v1/Eventszones`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventszones
     * @name V1EventszonesUpdate
     * @request PUT:/api/v1/Eventszones
     */
    v1EventszonesUpdate: (data: TblEventszone, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Eventszones`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventszones
     * @name V1EventszonesDetail
     * @request GET:/api/v1/Eventszones/{id}
     */
    v1EventszonesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblEventszone, any>({
        path: `/api/v1/Eventszones/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventszones
     * @name V1EventszonesDelete
     * @request DELETE:/api/v1/Eventszones/{id}
     */
    v1EventszonesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Eventszones/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventszonesfiles
     * @name V1EventszonesfilesCreate
     * @request POST:/api/v1/Eventszonesfiles
     */
    v1EventszonesfilesCreate: (
      data: TblEventszonesfile,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Eventszonesfiles`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventszonesfiles
     * @name V1EventszonesfilesList
     * @request GET:/api/v1/Eventszonesfiles
     */
    v1EventszonesfilesList: (params: RequestParams = {}) =>
      this.request<TblEventszonesfile[], any>({
        path: `/api/v1/Eventszonesfiles`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventszonesfiles
     * @name V1EventszonesfilesUpdate
     * @request PUT:/api/v1/Eventszonesfiles
     */
    v1EventszonesfilesUpdate: (
      data: TblEventszonesfile,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Eventszonesfiles`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventszonesfiles
     * @name V1EventszonesfilesDetail
     * @request GET:/api/v1/Eventszonesfiles/{id}
     */
    v1EventszonesfilesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblEventszonesfile, any>({
        path: `/api/v1/Eventszonesfiles/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventszonesfiles
     * @name V1EventszonesfilesDelete
     * @request DELETE:/api/v1/Eventszonesfiles/{id}
     */
    v1EventszonesfilesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Eventszonesfiles/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventtypes
     * @name V1EventtypesCreate
     * @request POST:/api/v1/Eventtypes
     */
    v1EventtypesCreate: (data: TblEventtype, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Eventtypes`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventtypes
     * @name V1EventtypesList
     * @request GET:/api/v1/Eventtypes
     */
    v1EventtypesList: (params: RequestParams = {}) =>
      this.request<TblEventtype[], any>({
        path: `/api/v1/Eventtypes`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventtypes
     * @name V1EventtypesUpdate
     * @request PUT:/api/v1/Eventtypes
     */
    v1EventtypesUpdate: (data: TblEventtype, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Eventtypes`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventtypes
     * @name V1EventtypesDetail
     * @request GET:/api/v1/Eventtypes/{id}
     */
    v1EventtypesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblEventtype, any>({
        path: `/api/v1/Eventtypes/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Eventtypes
     * @name V1EventtypesDelete
     * @request DELETE:/api/v1/Eventtypes/{id}
     */
    v1EventtypesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Eventtypes/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Extcompanies
     * @name V1ExtcompaniesCreate
     * @request POST:/api/v1/Extcompanies
     */
    v1ExtcompaniesCreate: (
      data: TblExternalcompany,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Extcompanies`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Extcompanies
     * @name V1ExtcompaniesList
     * @request GET:/api/v1/Extcompanies
     */
    v1ExtcompaniesList: (params: RequestParams = {}) =>
      this.request<TblExternalcompany[], any>({
        path: `/api/v1/Extcompanies`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Extcompanies
     * @name V1ExtcompaniesUpdate
     * @request PUT:/api/v1/Extcompanies
     */
    v1ExtcompaniesUpdate: (
      data: TblExternalcompany,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Extcompanies`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Extcompanies
     * @name V1ExtcompaniesDetail
     * @request GET:/api/v1/Extcompanies/{id}
     */
    v1ExtcompaniesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblExternalcompany, any>({
        path: `/api/v1/Extcompanies/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Extcompanies
     * @name V1ExtcompaniesDelete
     * @request DELETE:/api/v1/Extcompanies/{id}
     */
    v1ExtcompaniesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Extcompanies/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Extemployees
     * @name V1ExtemployeesCreate
     * @request POST:/api/v1/Extemployees
     */
    v1ExtemployeesCreate: (
      data: TblExternalemployee,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Extemployees`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Extemployees
     * @name V1ExtemployeesList
     * @request GET:/api/v1/Extemployees
     */
    v1ExtemployeesList: (params: RequestParams = {}) =>
      this.request<TblExternalemployee[], any>({
        path: `/api/v1/Extemployees`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Extemployees
     * @name V1ExtemployeesUpdate
     * @request PUT:/api/v1/Extemployees
     */
    v1ExtemployeesUpdate: (
      data: TblExternalemployee,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Extemployees`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Extemployees
     * @name V1ExtemployeesDetail
     * @request GET:/api/v1/Extemployees/{id}
     */
    v1ExtemployeesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblExternalemployee, any>({
        path: `/api/v1/Extemployees/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Extemployees
     * @name V1ExtemployeesDelete
     * @request DELETE:/api/v1/Extemployees/{id}
     */
    v1ExtemployeesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Extemployees/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Jobs
     * @name V1JobsCreate
     * @request POST:/api/v1/Jobs
     */
    v1JobsCreate: (data: TblJob, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Jobs`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Jobs
     * @name V1JobsList
     * @request GET:/api/v1/Jobs
     */
    v1JobsList: (params: RequestParams = {}) =>
      this.request<ViewJob[], any>({
        path: `/api/v1/Jobs`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Jobs
     * @name V1JobsUpdate
     * @request PUT:/api/v1/Jobs
     */
    v1JobsUpdate: (data: TblJob, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Jobs`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Jobs
     * @name V1JobsDetail
     * @request GET:/api/v1/Jobs/{id}
     */
    v1JobsDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblJob, any>({
        path: `/api/v1/Jobs/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Jobs
     * @name V1JobsDelete
     * @request DELETE:/api/v1/Jobs/{id}
     */
    v1JobsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Jobs/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Leads
     * @name V1LeadsCreate
     * @request POST:/api/v1/Leads
     */
    v1LeadsCreate: (data: TblLead, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Leads`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Leads
     * @name V1LeadsList
     * @request GET:/api/v1/Leads
     */
    v1LeadsList: (params: RequestParams = {}) =>
      this.request<ViewLead[], any>({
        path: `/api/v1/Leads`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Leads
     * @name V1LeadsUpdate
     * @request PUT:/api/v1/Leads
     */
    v1LeadsUpdate: (data: TblLead, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Leads`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Leads
     * @name V1LeadsDetail
     * @request GET:/api/v1/Leads/{id}
     */
    v1LeadsDetail: (id: number, params: RequestParams = {}) =>
      this.request<ViewLead, any>({
        path: `/api/v1/Leads/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Leads
     * @name V1LeadsDelete
     * @request DELETE:/api/v1/Leads/{id}
     */
    v1LeadsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Leads/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Plaidtrans
     * @name V1PlaidtransCreate
     * @request POST:/api/v1/Plaidtrans
     */
    v1PlaidtransCreate: (
      data: TblPlaidtransaction,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Plaidtrans`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Plaidtrans
     * @name V1PlaidtransList
     * @request GET:/api/v1/Plaidtrans
     */
    v1PlaidtransList: (
      query?: {
        /** @format int32 */
        Page?: number;
        /** @format int32 */
        Count?: number;
        /** @format int32 */
        Order?: number;
      },
      params: RequestParams = {}
    ) =>
      this.request<TblPlaidtransaction[], any>({
        path: `/api/v1/Plaidtrans`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Plaidtrans
     * @name V1PlaidtransUpdate
     * @request PUT:/api/v1/Plaidtrans
     */
    v1PlaidtransUpdate: (
      data: TblPlaidtransaction,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Plaidtrans`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Plaidtrans
     * @name V1PlaidtransDetail
     * @request GET:/api/v1/Plaidtrans/{id}
     */
    v1PlaidtransDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblPlaidtransaction, any>({
        path: `/api/v1/Plaidtrans/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Plaidtrans
     * @name V1PlaidtransDelete
     * @request DELETE:/api/v1/Plaidtrans/{id}
     */
    v1PlaidtransDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Plaidtrans/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Plaidtrans
     * @name V1PlaidtransByusedList
     * @request GET:/api/v1/Plaidtrans/byused
     */
    v1PlaidtransByusedList: (
      query?: {
        /** @format int32 */
        Page?: number;
        /** @format int32 */
        Count?: number;
        /** @format int32 */
        Order?: number;
        id?: boolean;
      },
      params: RequestParams = {}
    ) =>
      this.request<TblPlaidtransaction[], any>({
        path: `/api/v1/Plaidtrans/byused`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Product
     * @name V1ProductCreate
     * @request POST:/api/v1/Product
     */
    v1ProductCreate: (data: TblProduct, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Product`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Product
     * @name V1ProductList
     * @request GET:/api/v1/Product
     */
    v1ProductList: (params: RequestParams = {}) =>
      this.request<TblProduct[], any>({
        path: `/api/v1/Product`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Product
     * @name V1ProductUpdate
     * @request PUT:/api/v1/Product
     */
    v1ProductUpdate: (data: TblProduct, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Product`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Product
     * @name V1ProductDetail
     * @request GET:/api/v1/Product/{id}
     */
    v1ProductDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblProduct, any>({
        path: `/api/v1/Product/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Product
     * @name V1ProductDelete
     * @request DELETE:/api/v1/Product/{id}
     */
    v1ProductDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Product/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Productserials
     * @name V1ProductserialsCreate
     * @request POST:/api/v1/Productserials
     */
    v1ProductserialsCreate: (
      data: TblProductserial,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Productserials`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Productserials
     * @name V1ProductserialsList
     * @request GET:/api/v1/Productserials
     */
    v1ProductserialsList: (params: RequestParams = {}) =>
      this.request<TblProductserial[], any>({
        path: `/api/v1/Productserials`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Productserials
     * @name V1ProductserialsUpdate
     * @request PUT:/api/v1/Productserials
     */
    v1ProductserialsUpdate: (
      data: TblProductserial,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Productserials`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Productserials
     * @name V1ProductserialsDetail
     * @request GET:/api/v1/Productserials/{id}
     */
    v1ProductserialsDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblProductserial, any>({
        path: `/api/v1/Productserials/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Productserials
     * @name V1ProductserialsDelete
     * @request DELETE:/api/v1/Productserials/{id}
     */
    v1ProductserialsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Productserials/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Productserials
     * @name V1ProductserialsByproductidDetail
     * @request GET:/api/v1/Productserials/byproductid/{id}
     */
    v1ProductserialsByproductidDetail: (
      id: number,
      params: RequestParams = {}
    ) =>
      this.request<TblProductserial[], any>({
        path: `/api/v1/Productserials/byproductid/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Productserials
     * @name V1ProductserialsByserialDetail
     * @request GET:/api/v1/Productserials/byserial/{id}
     */
    v1ProductserialsByserialDetail: (id: string, params: RequestParams = {}) =>
      this.request<TblProductserial[], any>({
        path: `/api/v1/Productserials/byserial/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projectfile
     * @name V1ProjectfileCreate
     * @request POST:/api/v1/Projectfile
     */
    v1ProjectfileCreate: (data: TblProjectfile, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Projectfile`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projectfile
     * @name V1ProjectfileList
     * @request GET:/api/v1/Projectfile
     */
    v1ProjectfileList: (params: RequestParams = {}) =>
      this.request<TblProjectfile[], any>({
        path: `/api/v1/Projectfile`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projectfile
     * @name V1ProjectfileUpdate
     * @request PUT:/api/v1/Projectfile
     */
    v1ProjectfileUpdate: (data: TblProjectfile, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Projectfile`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projectfile
     * @name V1ProjectfileDetail
     * @request GET:/api/v1/Projectfile/{id}
     */
    v1ProjectfileDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblProjectfile, any>({
        path: `/api/v1/Projectfile/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projectfile
     * @name V1ProjectfileDelete
     * @request DELETE:/api/v1/Projectfile/{id}
     */
    v1ProjectfileDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Projectfile/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name V1ProjectsCreate
     * @request POST:/api/v1/Projects
     */
    v1ProjectsCreate: (data: TblProject, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Projects`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name V1ProjectsList
     * @request GET:/api/v1/Projects
     */
    v1ProjectsList: (params: RequestParams = {}) =>
      this.request<TblProject[], any>({
        path: `/api/v1/Projects`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name V1ProjectsUpdate
     * @request PUT:/api/v1/Projects
     */
    v1ProjectsUpdate: (data: TblProject, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Projects`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name V1ProjectsDetail
     * @request GET:/api/v1/Projects/{id}
     */
    v1ProjectsDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblProject, any>({
        path: `/api/v1/Projects/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name V1ProjectsDelete
     * @request DELETE:/api/v1/Projects/{id}
     */
    v1ProjectsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Projects/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projects
     * @name V1ProjectsByleadDetail
     * @request GET:/api/v1/Projects/bylead/{id}
     */
    v1ProjectsByleadDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblProject[], any>({
        path: `/api/v1/Projects/bylead/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projecttypes
     * @name V1ProjecttypesCreate
     * @request POST:/api/v1/Projecttypes
     */
    v1ProjecttypesCreate: (data: TblProjecttype, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Projecttypes`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projecttypes
     * @name V1ProjecttypesList
     * @request GET:/api/v1/Projecttypes
     */
    v1ProjecttypesList: (params: RequestParams = {}) =>
      this.request<TblProjecttype[], any>({
        path: `/api/v1/Projecttypes`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projecttypes
     * @name V1ProjecttypesUpdate
     * @request PUT:/api/v1/Projecttypes
     */
    v1ProjecttypesUpdate: (data: TblProjecttype, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Projecttypes`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projecttypes
     * @name V1ProjecttypesDetail
     * @request GET:/api/v1/Projecttypes/{id}
     */
    v1ProjecttypesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblProjecttype, any>({
        path: `/api/v1/Projecttypes/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Projecttypes
     * @name V1ProjecttypesDelete
     * @request DELETE:/api/v1/Projecttypes/{id}
     */
    v1ProjecttypesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Projecttypes/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Properties
     * @name V1PropertiesCreate
     * @request POST:/api/v1/Properties
     */
    v1PropertiesCreate: (data: TblProperty, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Properties`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Properties
     * @name V1PropertiesList
     * @request GET:/api/v1/Properties
     */
    v1PropertiesList: (params: RequestParams = {}) =>
      this.request<TblProperty[], any>({
        path: `/api/v1/Properties`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Properties
     * @name V1PropertiesUpdate
     * @request PUT:/api/v1/Properties
     */
    v1PropertiesUpdate: (data: TblProperty, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Properties`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Properties
     * @name V1PropertiesDetail
     * @request GET:/api/v1/Properties/{id}
     */
    v1PropertiesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblProperty, any>({
        path: `/api/v1/Properties/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Properties
     * @name V1PropertiesDelete
     * @request DELETE:/api/v1/Properties/{id}
     */
    v1PropertiesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Properties/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Properties
     * @name V1PropertiesSearchList
     * @request GET:/api/v1/Properties/search
     */
    v1PropertiesSearchList: (
      query?: {
        Campo1?: string;
        Campo2?: string;
        Campo3?: string;
        /** @format int32 */
        Tipo?: number;
      },
      params: RequestParams = {}
    ) =>
      this.request<TblProperty, any>({
        path: `/api/v1/Properties/search`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Roles
     * @name V1RolesCreate
     * @request POST:/api/v1/Roles
     */
    v1RolesCreate: (data: RolesDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Roles`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Roles
     * @name V1RolesList
     * @request GET:/api/v1/Roles
     */
    v1RolesList: (params: RequestParams = {}) =>
      this.request<Roles[], any>({
        path: `/api/v1/Roles`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Roles
     * @name V1RolesUpdate
     * @request PUT:/api/v1/Roles
     */
    v1RolesUpdate: (data: RolesDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Roles`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Roles
     * @name V1RolesDetail
     * @request GET:/api/v1/Roles/{id}
     */
    v1RolesDetail: (id: string, params: RequestParams = {}) =>
      this.request<RolesDto2[], any>({
        path: `/api/v1/Roles/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Roles
     * @name V1RolesDelete
     * @request DELETE:/api/v1/Roles/{id}
     */
    v1RolesDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Roles/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheet
     * @name V1ScopesheetCreate
     * @request POST:/api/v1/Scopesheet
     */
    v1ScopesheetCreate: (data: TblScopesheet, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Scopesheet`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheet
     * @name V1ScopesheetList
     * @request GET:/api/v1/Scopesheet
     */
    v1ScopesheetList: (params: RequestParams = {}) =>
      this.request<TblScopesheet[], any>({
        path: `/api/v1/Scopesheet`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheet
     * @name V1ScopesheetUpdate
     * @request PUT:/api/v1/Scopesheet
     */
    v1ScopesheetUpdate: (data: TblScopesheet, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Scopesheet`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheet
     * @name V1ScopesheetDetail
     * @request GET:/api/v1/Scopesheet/{id}
     */
    v1ScopesheetDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblScopesheet, any>({
        path: `/api/v1/Scopesheet/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheet
     * @name V1ScopesheetDelete
     * @request DELETE:/api/v1/Scopesheet/{id}
     */
    v1ScopesheetDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Scopesheet/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetfiles
     * @name V1ScopesheetfilesCreate
     * @request POST:/api/v1/Scopesheetfiles
     */
    v1ScopesheetfilesCreate: (
      data: TblScopesheetfile,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Scopesheetfiles`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetfiles
     * @name V1ScopesheetfilesList
     * @request GET:/api/v1/Scopesheetfiles
     */
    v1ScopesheetfilesList: (params: RequestParams = {}) =>
      this.request<TblScopesheetfile[], any>({
        path: `/api/v1/Scopesheetfiles`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetfiles
     * @name V1ScopesheetfilesUpdate
     * @request PUT:/api/v1/Scopesheetfiles
     */
    v1ScopesheetfilesUpdate: (
      data: TblScopesheetfile,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Scopesheetfiles`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetfiles
     * @name V1ScopesheetfilesDetail
     * @request GET:/api/v1/Scopesheetfiles/{id}
     */
    v1ScopesheetfilesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblScopesheetfile, any>({
        path: `/api/v1/Scopesheetfiles/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetfiles
     * @name V1ScopesheetfilesDelete
     * @request DELETE:/api/v1/Scopesheetfiles/{id}
     */
    v1ScopesheetfilesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Scopesheetfiles/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetfiles
     * @name V1ScopesheetfilesByscopesheetDetail
     * @request GET:/api/v1/Scopesheetfiles/byscopesheet/{id}
     */
    v1ScopesheetfilesByscopesheetDetail: (
      id: number,
      params: RequestParams = {}
    ) =>
      this.request<TblScopesheetfile, any>({
        path: `/api/v1/Scopesheetfiles/byscopesheet/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetzones
     * @name V1ScopesheetzonesCreate
     * @request POST:/api/v1/Scopesheetzones
     */
    v1ScopesheetzonesCreate: (
      data: TblScopesheetzone,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Scopesheetzones`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetzones
     * @name V1ScopesheetzonesList
     * @request GET:/api/v1/Scopesheetzones
     */
    v1ScopesheetzonesList: (params: RequestParams = {}) =>
      this.request<TblScopesheetzone[], any>({
        path: `/api/v1/Scopesheetzones`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetzones
     * @name V1ScopesheetzonesUpdate
     * @request PUT:/api/v1/Scopesheetzones
     */
    v1ScopesheetzonesUpdate: (
      data: TblScopesheetzone,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Scopesheetzones`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetzones
     * @name V1ScopesheetzonesDetail
     * @request GET:/api/v1/Scopesheetzones/{id}
     */
    v1ScopesheetzonesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblScopesheetzone, any>({
        path: `/api/v1/Scopesheetzones/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetzones
     * @name V1ScopesheetzonesDelete
     * @request DELETE:/api/v1/Scopesheetzones/{id}
     */
    v1ScopesheetzonesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Scopesheetzones/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Scopesheetzones
     * @name V1ScopesheetzonesByscopesheetDetail
     * @request GET:/api/v1/Scopesheetzones/byscopesheet/{id}
     */
    v1ScopesheetzonesByscopesheetDetail: (
      id: number,
      params: RequestParams = {}
    ) =>
      this.request<TblScopesheetzone, any>({
        path: `/api/v1/Scopesheetzones/byscopesheet/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Shift
     * @name V1ShiftCreate
     * @request POST:/api/v1/Shift
     */
    v1ShiftCreate: (data: TblShift, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Shift`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Shift
     * @name V1ShiftList
     * @request GET:/api/v1/Shift
     */
    v1ShiftList: (params: RequestParams = {}) =>
      this.request<TblShift[], any>({
        path: `/api/v1/Shift`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Shift
     * @name V1ShiftUpdate
     * @request PUT:/api/v1/Shift
     */
    v1ShiftUpdate: (data: TblShift, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Shift`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Shift
     * @name V1ShiftDetail
     * @request GET:/api/v1/Shift/{id}
     */
    v1ShiftDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblShift, any>({
        path: `/api/v1/Shift/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Shift
     * @name V1ShiftDelete
     * @request DELETE:/api/v1/Shift/{id}
     */
    v1ShiftDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Shift/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectfiles
     * @name V1SubprojectfilesCreate
     * @request POST:/api/v1/Subprojectfiles
     */
    v1SubprojectfilesCreate: (
      data: TblSubprojectfile,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Subprojectfiles`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectfiles
     * @name V1SubprojectfilesList
     * @request GET:/api/v1/Subprojectfiles
     */
    v1SubprojectfilesList: (params: RequestParams = {}) =>
      this.request<TblSubprojectfile[], any>({
        path: `/api/v1/Subprojectfiles`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectfiles
     * @name V1SubprojectfilesUpdate
     * @request PUT:/api/v1/Subprojectfiles
     */
    v1SubprojectfilesUpdate: (
      data: TblSubprojectfile,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Subprojectfiles`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectfiles
     * @name V1SubprojectfilesDetail
     * @request GET:/api/v1/Subprojectfiles/{id}
     */
    v1SubprojectfilesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblSubprojectfile, any>({
        path: `/api/v1/Subprojectfiles/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectfiles
     * @name V1SubprojectfilesDelete
     * @request DELETE:/api/v1/Subprojectfiles/{id}
     */
    v1SubprojectfilesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Subprojectfiles/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectfiles
     * @name V1SubprojectfilesSearchList
     * @request GET:/api/v1/Subprojectfiles/search
     */
    v1SubprojectfilesSearchList: (
      query?: {
        /** @format int32 */
        Page?: number;
        /** @format int32 */
        Count?: number;
        /** @format int32 */
        Order?: number;
        /** @format int64 */
        SubprojectsId?: number;
        /** @format int32 */
        FiletypeId?: number;
      },
      params: RequestParams = {}
    ) =>
      this.request<TblSubprojectfile[], any>({
        path: `/api/v1/Subprojectfiles/search`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectfiles
     * @name V1SubprojectfilesCountList
     * @request GET:/api/v1/Subprojectfiles/count
     */
    v1SubprojectfilesCountList: (
      query?: {
        /** @format int64 */
        SubprojectsId?: number;
        /** @format int32 */
        FiletypeId?: number;
      },
      params: RequestParams = {}
    ) =>
      this.request<TblSubprojectfile, any>({
        path: `/api/v1/Subprojectfiles/count`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectpolicya
     * @name V1SubprojectpolicyaCreate
     * @request POST:/api/v1/Subprojectpolicya
     */
    v1SubprojectpolicyaCreate: (
      data: TblSubprojectpolicya,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Subprojectpolicya`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectpolicya
     * @name V1SubprojectpolicyaList
     * @request GET:/api/v1/Subprojectpolicya
     */
    v1SubprojectpolicyaList: (params: RequestParams = {}) =>
      this.request<TblSubprojectpolicya[], any>({
        path: `/api/v1/Subprojectpolicya`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectpolicya
     * @name V1SubprojectpolicyaUpdate
     * @request PUT:/api/v1/Subprojectpolicya
     */
    v1SubprojectpolicyaUpdate: (
      data: TblSubprojectpolicya,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Subprojectpolicya`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectpolicya
     * @name V1SubprojectpolicyaDetail
     * @request GET:/api/v1/Subprojectpolicya/{id}
     */
    v1SubprojectpolicyaDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblSubprojectpolicya, any>({
        path: `/api/v1/Subprojectpolicya/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectpolicya
     * @name V1SubprojectpolicyaDelete
     * @request DELETE:/api/v1/Subprojectpolicya/{id}
     */
    v1SubprojectpolicyaDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Subprojectpolicya/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojectpolicya
     * @name V1SubprojectpolicyaSubprojectDetail
     * @request GET:/api/v1/Subprojectpolicya/subproject/{id}
     */
    v1SubprojectpolicyaSubprojectDetail: (
      id: number,
      params: RequestParams = {}
    ) =>
      this.request<TblSubprojectpolicya, any>({
        path: `/api/v1/Subprojectpolicya/subproject/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojects
     * @name V1SubprojectsCreate
     * @request POST:/api/v1/Subprojects
     */
    v1SubprojectsCreate: (data: TblSubproject, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Subprojects`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojects
     * @name V1SubprojectsList
     * @request GET:/api/v1/Subprojects
     */
    v1SubprojectsList: (params: RequestParams = {}) =>
      this.request<TblSubproject[], any>({
        path: `/api/v1/Subprojects`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojects
     * @name V1SubprojectsUpdate
     * @request PUT:/api/v1/Subprojects
     */
    v1SubprojectsUpdate: (data: TblSubproject, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Subprojects`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojects
     * @name V1SubprojectsDetail
     * @request GET:/api/v1/Subprojects/{id}
     */
    v1SubprojectsDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblSubproject, any>({
        path: `/api/v1/Subprojects/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojects
     * @name V1SubprojectsDelete
     * @request DELETE:/api/v1/Subprojects/{id}
     */
    v1SubprojectsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Subprojects/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojects
     * @name V1SubprojectsByprojectDetail
     * @request GET:/api/v1/Subprojects/byproject/{id}
     */
    v1SubprojectsByprojectDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblSubproject[], any>({
        path: `/api/v1/Subprojects/byproject/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojecttypes
     * @name V1SubprojecttypesCreate
     * @request POST:/api/v1/Subprojecttypes
     */
    v1SubprojecttypesCreate: (
      data: TblSubprojecttype,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Subprojecttypes`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojecttypes
     * @name V1SubprojecttypesList
     * @request GET:/api/v1/Subprojecttypes
     */
    v1SubprojecttypesList: (params: RequestParams = {}) =>
      this.request<TblSubprojecttype[], any>({
        path: `/api/v1/Subprojecttypes`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojecttypes
     * @name V1SubprojecttypesUpdate
     * @request PUT:/api/v1/Subprojecttypes
     */
    v1SubprojecttypesUpdate: (
      data: TblSubprojecttype,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Subprojecttypes`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojecttypes
     * @name V1SubprojecttypesDetail
     * @request GET:/api/v1/Subprojecttypes/{id}
     */
    v1SubprojecttypesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblSubprojecttype, any>({
        path: `/api/v1/Subprojecttypes/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subprojecttypes
     * @name V1SubprojecttypesDelete
     * @request DELETE:/api/v1/Subprojecttypes/{id}
     */
    v1SubprojecttypesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Subprojecttypes/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemplates
     * @name V1SubtemplatesCreate
     * @request POST:/api/v1/Subtemplates
     */
    v1SubtemplatesCreate: (data: TblSubtemplate, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Subtemplates`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemplates
     * @name V1SubtemplatesList
     * @request GET:/api/v1/Subtemplates
     */
    v1SubtemplatesList: (params: RequestParams = {}) =>
      this.request<TblSubtemplate[], any>({
        path: `/api/v1/Subtemplates`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemplates
     * @name V1SubtemplatesUpdate
     * @request PUT:/api/v1/Subtemplates
     */
    v1SubtemplatesUpdate: (data: TblSubtemplate, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Subtemplates`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemplates
     * @name V1SubtemplatesDetail
     * @request GET:/api/v1/Subtemplates/{id}
     */
    v1SubtemplatesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblSubtemplate, any>({
        path: `/api/v1/Subtemplates/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemplates
     * @name V1SubtemplatesDelete
     * @request DELETE:/api/v1/Subtemplates/{id}
     */
    v1SubtemplatesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Subtemplates/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemproducts
     * @name V1SubtemproductsCreate
     * @request POST:/api/v1/Subtemproducts
     */
    v1SubtemproductsCreate: (
      data: TblSubtemplateproduct,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Subtemproducts`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemproducts
     * @name V1SubtemproductsList
     * @request GET:/api/v1/Subtemproducts
     */
    v1SubtemproductsList: (params: RequestParams = {}) =>
      this.request<TblSubtemplateproduct[], any>({
        path: `/api/v1/Subtemproducts`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemproducts
     * @name V1SubtemproductsUpdate
     * @request PUT:/api/v1/Subtemproducts
     */
    v1SubtemproductsUpdate: (
      data: TblSubtemplateproduct,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Subtemproducts`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemproducts
     * @name V1SubtemproductsDetail
     * @request GET:/api/v1/Subtemproducts/{id}
     */
    v1SubtemproductsDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblSubtemplateproduct, any>({
        path: `/api/v1/Subtemproducts/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemproducts
     * @name V1SubtemproductsDelete
     * @request DELETE:/api/v1/Subtemproducts/{id}
     */
    v1SubtemproductsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Subtemproducts/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Subtemproducts
     * @name V1SubtemproductsSubtempDetail
     * @request GET:/api/v1/Subtemproducts/subtemp/{id}
     */
    v1SubtemproductsSubtempDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblSubtemplateproduct[], any>({
        path: `/api/v1/Subtemproducts/subtemp/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Templates
     * @name V1TemplatesCreate
     * @request POST:/api/v1/Templates
     */
    v1TemplatesCreate: (data: TblTemplate, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Templates`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Templates
     * @name V1TemplatesList
     * @request GET:/api/v1/Templates
     */
    v1TemplatesList: (params: RequestParams = {}) =>
      this.request<TblTemplate[], any>({
        path: `/api/v1/Templates`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Templates
     * @name V1TemplatesUpdate
     * @request PUT:/api/v1/Templates
     */
    v1TemplatesUpdate: (data: TblTemplate, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Templates`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Templates
     * @name V1TemplatesDetail
     * @request GET:/api/v1/Templates/{id}
     */
    v1TemplatesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblTemplate, any>({
        path: `/api/v1/Templates/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Templates
     * @name V1TemplatesDelete
     * @request DELETE:/api/v1/Templates/{id}
     */
    v1TemplatesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Templates/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Update
     * @name V1UpdateCreate
     * @request POST:/api/v1/Update
     */
    v1UpdateCreate: (data: TblUpdate, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Update`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Update
     * @name V1UpdateList
     * @request GET:/api/v1/Update
     */
    v1UpdateList: (params: RequestParams = {}) =>
      this.request<TblUpdate[], any>({
        path: `/api/v1/Update`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Update
     * @name V1UpdateUpdate
     * @request PUT:/api/v1/Update
     */
    v1UpdateUpdate: (data: TblUpdate, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Update`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Update
     * @name V1UpdateDetail
     * @request GET:/api/v1/Update/{id}
     */
    v1UpdateDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblUpdate, any>({
        path: `/api/v1/Update/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Update
     * @name V1UpdateDelete
     * @request DELETE:/api/v1/Update/{id}
     */
    v1UpdateDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Update/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Update
     * @name V1UpdateCountDetail
     * @request GET:/api/v1/Update/count/{id}
     */
    v1UpdateCountDetail: (id: number, params: RequestParams = {}) =>
      this.request<number, any>({
        path: `/api/v1/Update/count/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Updatelikes
     * @name V1UpdatelikesCreate
     * @request POST:/api/v1/Updatelikes
     */
    v1UpdatelikesCreate: (data: TblUpdatelike, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Updatelikes`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Updatelikes
     * @name V1UpdatelikesList
     * @request GET:/api/v1/Updatelikes
     */
    v1UpdatelikesList: (params: RequestParams = {}) =>
      this.request<TblUpdatelike[], any>({
        path: `/api/v1/Updatelikes`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Updatelikes
     * @name V1UpdatelikesUpdate
     * @request PUT:/api/v1/Updatelikes
     */
    v1UpdatelikesUpdate: (data: TblUpdatelike, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Updatelikes`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Updatelikes
     * @name V1UpdatelikesDetail
     * @request GET:/api/v1/Updatelikes/{id}
     */
    v1UpdatelikesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblUpdatelike, any>({
        path: `/api/v1/Updatelikes/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Updatelikes
     * @name V1UpdatelikesDelete
     * @request DELETE:/api/v1/Updatelikes/{id}
     */
    v1UpdatelikesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Updatelikes/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name V1UsersLoginCreate
     * @request POST:/api/v1/Users/login
     */
    v1UsersLoginCreate: (
      data: AuthenticateRequest,
      params: RequestParams = {}
    ) =>
      this.request<UsersDto, any>({
        path: `/api/v1/Users/login`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name V1UsersDashboardList
     * @request GET:/api/v1/Users/dashboard
     */
    v1UsersDashboardList: (params: RequestParams = {}) =>
      this.request<UsersDto, any>({
        path: `/api/v1/Users/dashboard`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name V1UsersGetseccodCreate
     * @request POST:/api/v1/Users/getseccod
     */
    v1UsersGetseccodCreate: (data: UsersDto, params: RequestParams = {}) =>
      this.request<UsersDto, any>({
        path: `/api/v1/Users/getseccod`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name V1UsersSetpasswdCreate
     * @request POST:/api/v1/Users/setpasswd
     */
    v1UsersSetpasswdCreate: (data: UsersDto, params: RequestParams = {}) =>
      this.request<UsersDto, any>({
        path: `/api/v1/Users/setpasswd`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name V1UsersPersonalDetail
     * @request GET:/api/v1/Users/personal/{id}
     */
    v1UsersPersonalDetail: (id: string, params: RequestParams = {}) =>
      this.request<UsersDto, any>({
        path: `/api/v1/Users/personal/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name V1UsersCreate
     * @request POST:/api/v1/Users
     */
    v1UsersCreate: (data: Users, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Users`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name V1UsersList
     * @request GET:/api/v1/Users
     */
    v1UsersList: (params: RequestParams = {}) =>
      this.request<UsersDto[], any>({
        path: `/api/v1/Users`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name V1UsersUpdate
     * @request PUT:/api/v1/Users
     */
    v1UsersUpdate: (data: Users, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Users`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name V1UsersDetail
     * @request GET:/api/v1/Users/{id}
     */
    v1UsersDetail: (id: number, params: RequestParams = {}) =>
      this.request<UsersDto, any>({
        path: `/api/v1/Users/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Users
     * @name V1UsersDelete
     * @request DELETE:/api/v1/Users/{id}
     */
    v1UsersDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Users/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Userschat
     * @name V1UserschatList
     * @request GET:/api/v1/Userschat
     */
    v1UserschatList: (
      query?: {
        /** @format int32 */
        Page?: number;
        /** @format int32 */
        Count?: number;
        /** @format int32 */
        Order?: number;
      },
      params: RequestParams = {}
    ) =>
      this.request<ViewUserschat[], any>({
        path: `/api/v1/Userschat`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Userschat
     * @name V1UserschatSearchList
     * @request GET:/api/v1/Userschat/search
     */
    v1UserschatSearchList: (
      query?: {
        /** @format int32 */
        Page?: number;
        /** @format int32 */
        Count?: number;
        /** @format int32 */
        Order?: number;
        username?: string;
        firstname?: string;
        lastname?: string;
      },
      params: RequestParams = {}
    ) =>
      this.request<ViewUserschat[], any>({
        path: `/api/v1/Userschat/search`,
        method: "GET",
        query: query,
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vonage
     * @name V1VonageShowList
     * @request GET:/api/v1/Vonage/show
     */
    v1VonageShowList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Vonage/show`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vonage
     * @name V1VonageCreate
     * @request POST:/api/v1/Vonage
     */
    v1VonageCreate: (data: UsersSummary, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Vonage`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vonage
     * @name V1VonageList
     * @request GET:/api/v1/Vonage
     */
    v1VonageList: (params: RequestParams = {}) =>
      this.request<UsersSummary[], any>({
        path: `/api/v1/Vonage`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Vonage
     * @name V1VonageDetail
     * @request GET:/api/v1/Vonage/{id}
     */
    v1VonageDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblCategory, any>({
        path: `/api/v1/Vonage/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallets
     * @name V1WalletsCreate
     * @request POST:/api/v1/Wallets
     */
    v1WalletsCreate: (data: TblWallet, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Wallets`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallets
     * @name V1WalletsList
     * @request GET:/api/v1/Wallets
     */
    v1WalletsList: (params: RequestParams = {}) =>
      this.request<TblWallet[], any>({
        path: `/api/v1/Wallets`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallets
     * @name V1WalletsUpdate
     * @request PUT:/api/v1/Wallets
     */
    v1WalletsUpdate: (data: TblWallet, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Wallets`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallets
     * @name V1WalletsDetail
     * @request GET:/api/v1/Wallets/{id}
     */
    v1WalletsDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblWallet, any>({
        path: `/api/v1/Wallets/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallets
     * @name V1WalletsDelete
     * @request DELETE:/api/v1/Wallets/{id}
     */
    v1WalletsDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Wallets/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallets
     * @name V1WalletsByuserDetail
     * @request GET:/api/v1/Wallets/byuser/{id}
     */
    v1WalletsByuserDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblWallet[], any>({
        path: `/api/v1/Wallets/byuser/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallettrans
     * @name V1WallettransCreate
     * @request POST:/api/v1/Wallettrans
     */
    v1WallettransCreate: (
      data: TblWallettransaction,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Wallettrans`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallettrans
     * @name V1WallettransList
     * @request GET:/api/v1/Wallettrans
     */
    v1WallettransList: (params: RequestParams = {}) =>
      this.request<ViewWallettran[], any>({
        path: `/api/v1/Wallettrans`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallettrans
     * @name V1WallettransUpdate
     * @request PUT:/api/v1/Wallettrans
     */
    v1WallettransUpdate: (
      data: TblWallettransaction,
      params: RequestParams = {}
    ) =>
      this.request<void, any>({
        path: `/api/v1/Wallettrans`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallettrans
     * @name V1WallettransDetail
     * @request GET:/api/v1/Wallettrans/{id}
     */
    v1WallettransDetail: (id: number, params: RequestParams = {}) =>
      this.request<ViewWallettran, any>({
        path: `/api/v1/Wallettrans/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallettrans
     * @name V1WallettransDelete
     * @request DELETE:/api/v1/Wallettrans/{id}
     */
    v1WallettransDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Wallettrans/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Wallettrans
     * @name V1WallettransBywalletDetail
     * @request GET:/api/v1/Wallettrans/bywallet/{id}
     */
    v1WallettransBywalletDetail: (id: number, params: RequestParams = {}) =>
      this.request<ViewWallettran[], any>({
        path: `/api/v1/Wallettrans/bywallet/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Weather
     * @name V1WeatherShowList
     * @request GET:/api/v1/Weather/show
     */
    v1WeatherShowList: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Weather/show`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Works
     * @name V1WorksCreate
     * @request POST:/api/v1/Works
     */
    v1WorksCreate: (data: Works, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Works`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Works
     * @name V1WorksList
     * @request GET:/api/v1/Works
     */
    v1WorksList: (params: RequestParams = {}) =>
      this.request<Works[], any>({
        path: `/api/v1/Works`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Works
     * @name V1WorksUpdate
     * @request PUT:/api/v1/Works
     */
    v1WorksUpdate: (data: Works, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Works`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Works
     * @name V1WorksDetail
     * @request GET:/api/v1/Works/{id}
     */
    v1WorksDetail: (id: string, params: RequestParams = {}) =>
      this.request<Works, any>({
        path: `/api/v1/Works/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Works
     * @name V1WorksDelete
     * @request DELETE:/api/v1/Works/{id}
     */
    v1WorksDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Works/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Worktypes
     * @name V1WorktypesCreate
     * @request POST:/api/v1/Worktypes
     */
    v1WorktypesCreate: (data: Worktypes, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Worktypes`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Worktypes
     * @name V1WorktypesList
     * @request GET:/api/v1/Worktypes
     */
    v1WorktypesList: (params: RequestParams = {}) =>
      this.request<Worktypes[], any>({
        path: `/api/v1/Worktypes`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Worktypes
     * @name V1WorktypesUpdate
     * @request PUT:/api/v1/Worktypes
     */
    v1WorktypesUpdate: (data: Worktypes, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Worktypes`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Worktypes
     * @name V1WorktypesDetail
     * @request GET:/api/v1/Worktypes/{id}
     */
    v1WorktypesDetail: (id: string, params: RequestParams = {}) =>
      this.request<Worktypes, any>({
        path: `/api/v1/Worktypes/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Worktypes
     * @name V1WorktypesDelete
     * @request DELETE:/api/v1/Worktypes/{id}
     */
    v1WorktypesDelete: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Worktypes/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Zonetypes
     * @name V1ZonetypesCreate
     * @request POST:/api/v1/Zonetypes
     */
    v1ZonetypesCreate: (data: TblZonetype, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Zonetypes`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Zonetypes
     * @name V1ZonetypesList
     * @request GET:/api/v1/Zonetypes
     */
    v1ZonetypesList: (params: RequestParams = {}) =>
      this.request<TblZonetype[], any>({
        path: `/api/v1/Zonetypes`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Zonetypes
     * @name V1ZonetypesUpdate
     * @request PUT:/api/v1/Zonetypes
     */
    v1ZonetypesUpdate: (data: TblZonetype, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Zonetypes`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Zonetypes
     * @name V1ZonetypesDetail
     * @request GET:/api/v1/Zonetypes/{id}
     */
    v1ZonetypesDetail: (id: number, params: RequestParams = {}) =>
      this.request<TblZonetype, any>({
        path: `/api/v1/Zonetypes/${id}`,
        method: "GET",
        format: "json",
        ...params,
      }),

    /**
     * No description
     *
     * @tags Zonetypes
     * @name V1ZonetypesDelete
     * @request DELETE:/api/v1/Zonetypes/{id}
     */
    v1ZonetypesDelete: (id: number, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/api/v1/Zonetypes/${id}`,
        method: "DELETE",
        ...params,
      }),
  };
}
