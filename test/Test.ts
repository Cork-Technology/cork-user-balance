import assert from "assert";
import { 
  TestHelpers,
  CorkCT_Approval
} from "generated";
const { MockDb, CorkCT } = TestHelpers;

describe("CorkCT contract Approval event tests", () => {
  // Create mock db
  const mockDb = MockDb.createMockDb();

  // Creating mock for CorkCT contract Approval event
  const event = CorkCT.Approval.createMockEvent({/* It mocks event fields with default values. You can overwrite them if you need */});

  it("CorkCT_Approval is created correctly", async () => {
    // Processing the event
    const mockDbUpdated = await CorkCT.Approval.processEvent({
      event,
      mockDb,
    });

    // Getting the actual entity from the mock database
    let actualCorkCTApproval = mockDbUpdated.entities.CorkCT_Approval.get(
      `${event.chainId}_${event.block.number}_${event.logIndex}`
    );

    // Creating the expected entity
    const expectedCorkCTApproval: CorkCT_Approval = {
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      srcAddress: event.srcAddress,
      owner: event.params.owner,
      spender: event.params.spender,
      value: event.params.value,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(actualCorkCTApproval, expectedCorkCTApproval, "Actual CorkCTApproval should be the same as the expectedCorkCTApproval");
  });
});
