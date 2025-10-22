import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CLIConfig } from '../utils/config.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock axios for network calls
const mockAxiosGet = jest.fn();
const mockAxiosPost = jest.fn();

jest.mock('axios', () => ({
  default: {
    get: mockAxiosGet,
    post: mockAxiosPost
  }
}));

describe('Authentication Persistence Tests', () => {
  let testConfigDir: string;
  let config: CLIConfig;

  beforeEach(async () => {
    // Create a temporary test directory for each test
    testConfigDir = path.join(os.tmpdir(), `test-auth-persistence-${Date.now()}-${Math.random()}`);
    await fs.mkdir(testConfigDir, { recursive: true });
    
    // Create a new config instance with test directory
    config = new (CLIConfig as any)();
    (config as any).configDir = testConfigDir;
    (config as any).configPath = path.join(testConfigDir, 'config.json');
    (config as any).lockFile = path.join(testConfigDir, 'config.lock');
    
    await config.init();

    // Clear axios mocks
    mockAxiosGet.mockClear();
    mockAxiosPost.mockClear();
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Credential Storage and Retrieval', () => {
    it('should store and retrieve vendor key credentials across CLI sessions', async () => {
      const testVendorKey = 'pk_test123456789.sk_test123456789012345';
      
      // Mock successful server validation
      mockAxiosGet.mockResolvedValueOnce({ status: 200, data: { status: 'ok' } });
      
      // Store vendor key
      await config.setVendorKey(testVendorKey);
      
      // Verify storage
      expect(config.getVendorKey()).toBe(testVendorKey);
      expect(config.get('authMethod')).toBe('vendor_key');
      expect(config.get('lastValidated')).toBeDefined();
      
      // Simulate new CLI session by creating new config instance
      const newConfig = new (CLIConfig as any)();
      (newConfig as any).conf });
});});
 (0);
    BeCount()).toetFailureg.g(confi   expect45');
   3456789012389.sk_test124567pk_test123rKey('g.setVendoait confi  awlures
    eset fai rshouldting y setvendor kel cessfu// Suc
         
   ' } });us: 'ok stat0, data: {s: 20 statueOnce({lukResolvedVa.mocxiosGetckA    mo  validation
ul server uccessf  // Mock s   ;
      
 t()).toBe(2)tFailureCoungeconfig.     expect(t();
 FailureCouncrement config.inawait     ;
 t()ounFailureCcrementfig.inawait con
       failuresdd some    // A  ) => {
ync (on', ashenticatiul autessfount on succailure cd reset f  it('shoul  });

  ds
  econ 2 s2000); //Ms()).toBe(DelayetAuth.gconfigct(pe   ex);
   ).toBe(trueh()ayAutDeluldshopect(config.   ex
   e(3);Count()).toBilureetFafig.g expect(con     reCount();
entFailug.incremnfiwait co     a 
 
     false);uth()).toBe(ayADelg.shouldnfixpect(co      efailures
until 3 lay ould not de Sh
      //;
      ()).toBe(2)untgetFailureCoect(config.    exp);
  Count(ailurentFemencr.iait config aw    
     
  ned();toBeDefi).uthFailure()etLastAct(config.g      expee(1);
.toBount())etFailureCnfig.g expect(co
     nt();CouFailure.incrementawait configs
      ilurement fa // Incre    
     se);
  e(faltoB)).layAuth(Deg.shouldnfiexpect(co  Be(0);
    nt()).toureCoutFail.geonfig    expect(c
  () => {ly', async res correctation failuuthenticould track a'sh {
    it( =>ng', ()re Trackiation Failuhenticbe('Aut
  descri
  });

    }); });     r message
urn errod ret'); // Shoulstring('toBeult).f respeo   expect(tye);
     ruBe(ttolt).not. expect(resu   
    mat(key);eyFororKidateVend= config.valonst result 
        c(key => {achidKeys.forE   inval     
      ];
  
  characters// invalid lid', sk_test@invast123456789.te'pk_      rt
  hooo sret part t// secshort', pk_test.sk_      'rt
   pa secret_', // empty123456789.skk_test        'ppart
ic  empty publ9012345', //st12345678k_.sk_te     'p  er
 rong ord/ w', /_testest.pk   'sk_tpart
     ret  sec/ missing'pk_test', /     
   // no dotd-key', ali'inv     empty
    //         '',Keys = [
nvalid i  const    => {
 ats', () key formvalid vendord reject int('shoul    i    });

     });
e);
 ruoBe(t.tect(result)exp
        rmat(key);orKeyFoteVendalidaonfig.v ct =nst resul     co => {
   rEach(key.folidKeys 
      va     ];
6'
      34556789012_12345678.sk    'pk_1234  HI',
  123DEF456G789ABC456.sk_XYZBC123DEF      'pk_A012345',
  89st12345676789.sk_te12345pk_test     '   s = [
validKey     const  () => {
 format',dor key  venrrectvalidate coit('should     ) => {
', (y Validation Keribe('Vendordesc });

  
    });
 oBe(true);cated).tisAuthentipect(    exated();
  ic.isAuthentconfigit icated = awa isAuthentst
      conen as validtoktect  deld     // Shou    
 
  en);lidTokken(va.setToait configaw
      
      YgR6c';aqt7Rwu7dEh5ZUlCbCKJW8P8h6SWp-38RKzJll9.L5OTk5OTOTkHAiOjk5MDIyLCJlejM5WF0IjoxNTE2MiaG9lIiwIkpvaG4gRI6ZSODkwIiwibmFt0NTY3IiOiIxMjMeyJzdWI6IkpXVCJ9.nR5cCI1NiIsIiOiJIUz = 'eyJhbGckenidTost valcon     future)
 ar in the  (exp fd JWT tokenreate a vali
      // Cync () => {, asT tokens'alid JWect vd det('shoul  it
  
   });
 ;lse)d).toBe(faicateuthentpect(isA    exated();
  nticfig.isAutheawait conticated = nst isAuthen      coas expired
ect token uld det  // Sho    );
      
okeniredTken(expig.setTot conf      awai
      
Q';wFzzht-KlaQD8A9V8b6RFmMazPUVaVF43UFY4Adcj39.MzkwMjJ1MTYyHAiOjEJlejM5MDIyLCoxNTE2MiwiaWF0IjG4gRG9lIkpvaZSI6IODkwIiwibmFtMjM0NTY3IxzdWIiOiyJVCJ9.eCI6IkpXI1NiIsInR5cOiJIUzGciken = 'eyJhbToonst expiredt)
      cpashe in texp T token (ed JWirate an exp   // Cre => {
   sync ()tokens', axpired JWT d detect ehoul
    it('s> {ing', () =piry Handl Exbe('Tokenescri;

  d  });
  })
  deviceId1);Be(toceId2).pect(devi     ex
 vice IDame deld be the s   // Shou   
  d();
    tDeviceIonfig.ge newC2 = awaitst deviceId    con
  ssionond sen sec ievice ID  // Get d   ;
      
 t()g.iniit newConfi awa     g.lock');
r, 'confiestConfigDin(tpath.joilockFile = as any).newConfig   (  
  .json');nfig'configDir, testCon(th.joipaath = configPny).as anewConfig 
      (ir;testConfigD = gDirnficoany).nfig as      (newCo;
 s any)()CLIConfig aig = new (Conf newonst    cssion
  new CLI seSimulate // 
           0);
 han(reaterTgth).toBeGd1.leneviceIct(d      expe);
g'('strinceId1).toBe devieofpect(typ ex
     Defined();).toBeeId1pect(devic;
      exeId().getDevicnfig= await cod1 eInst devicco     sion
 st sesn firdevice ID i// Get 
       () => {ons', asyncss sessiency acroonsistevice ID cn daid maint   it('shoul;

 );
    })eDefined(toB')).lidatedtVafig.get('laswCont(ne  expecey');
    e('vendor_kd')).toBetho('authMonfig.getexpect(newC
      );ndorKeyoBe(testVe()).tVendorKeyig.getConfct(newexpe   ssions
   ss sestence acropersiify     // Ver   
();
     itwConfig.inawait ne
      lock');g.Dir, 'confiConfigestath.join(tckFile = pg as any).loewConfi);
      (ng.json'gDir, 'confi(testConfi path.jointh =figPa).connyg as anfiwCo
      (neir;ConfigD testigDir =